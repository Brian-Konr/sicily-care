// 資料層：畫面只跟這裡講話，底下的介面卡（mock／gas）可以抽換。
// 所有寫入先進「待送佇列」（localStorage），再嘗試送出：離線不會遺失，上線後依序補送。
// 每筆紀錄的 id 由前端產生，後端遇到重複 id 會當成功，所以重送是安全的。
import type { Food, HistoryPage, LogRecord, LogTable, NewRecord, RecordOf, Snapshot } from './sheet'
import { tpeIso } from './time'
import { DEFAULT_CONFIG } from '@/data/defaults'
import { NetworkError, PERMANENT_ERRORS, ServerError } from './errors'
import type { Adapter, Response, WriteOp } from './types'

export type { Adapter } from './types'

type Queued = WriteOp & { qid: string; queuedAt: string }
export interface FailedWrite { op: WriteOp; error: string; message?: string; queuedAt: string }
export interface ApiStatus { pending: number; failed: FailedWrite[]; online: boolean; adapter: string }

const uuid = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })

const emptySnapshot = (now: number): Snapshot => ({
  ok: true, days: 7, serverTime: tpeIso(now), config: { ...DEFAULT_CONFIG },
  tables: { Feed: [], Litter: [], Weight: [], Med: [], Issue: [], Care: [], Foods: [] },
})

const isFail = (r: Response): r is { ok: false; error: string; message?: string } => r.ok === false

export interface ApiOptions {
  adapter: Adapter
  storage?: Storage
  who: string
  now?: () => number
  prefix?: string
}

export function createApi({ adapter, storage, who, now = () => Date.now(), prefix = 'sicily' }: ApiOptions) {
  const K = { outbox: `${prefix}.outbox`, failed: `${prefix}.failed`, cache: `${prefix}.cache` }
  const mem = new Map<string, string>()
  const getRaw = (k: string) => (storage ? storage.getItem(k) : mem.get(k) ?? null)
  const setRaw = (k: string, v: string) => (storage ? storage.setItem(k, v) : mem.set(k, v))
  const getList = <T>(k: string): T[] => JSON.parse(getRaw(k) || '[]') as T[]
  const putList = (k: string, v: unknown[]) => setRaw(k, JSON.stringify(v))

  const listeners = new Set<(s: ApiStatus) => void>()
  let online = true
  let flushing: Promise<number> | null = null
  let lastData: Snapshot | null = null
  let older: Partial<Record<LogTable, LogRecord[]>> = {}
  const fetchedBefores = new Set<string>()

  const status = (): ApiStatus => ({ pending: getList(K.outbox).length, failed: getList<FailedWrite>(K.failed), online, adapter: adapter.kind })
  const emit = () => { const s = status(); listeners.forEach((fn) => fn(s)) }

  /** 依序送出佇列；斷線就停，永久錯誤移到 failed 後繼續 */
  async function flush(): Promise<number> {
    if (flushing) return flushing
    flushing = (async () => {
      let sent = 0
      for (;;) {
        const box = getList<Queued>(K.outbox)
        if (!box.length) break
        const { qid, queuedAt, ...op } = box[0]
        let res: Response
        try {
          res = await adapter.call(op as WriteOp)
          online = true
        } catch (err) {
          if (err instanceof NetworkError) { online = false; break }
          throw err
        }
        if (isFail(res) && !PERMANENT_ERRORS.has(res.error)) break // busy、server_error：稍後重試
        putList(K.outbox, getList<Queued>(K.outbox).filter((x) => x.qid !== qid))
        if (isFail(res)) putList(K.failed, [...getList(K.failed), { op, error: res.error, message: res.message, queuedAt }])
        else {
          sent += 1
          if (lastData) { applyOp(lastData, op as WriteOp, false); setRaw(K.cache, JSON.stringify(lastData)) }
        }
      }
      return sent
    })()
    try { return await flushing } finally { flushing = null; emit() }
  }

  async function write(op: WriteOp): Promise<{ queued: boolean }> {
    const qid = uuid()
    putList(K.outbox, [...getList(K.outbox), { ...op, qid, queuedAt: tpeIso(now()) }])
    emit()
    await flush()
    return { queued: getList<Queued>(K.outbox).some((x) => x.qid === qid) }
  }

  /** 把一個寫入套用到快照上（pending＝還沒送出，畫面標「待上傳」） */
  function applyOp(data: Snapshot, op: WriteOp, pending: boolean) {
    const mark = pending ? { __pending: true } : {}
    if (op.action === 'setConfig') { data.config = { ...data.config, [op.key]: op.value }; return }
    if (op.action === 'upsertFood') {
      const foods = data.tables.Foods
      const i = foods.findIndex((f) => f.food_id === op.record.food_id)
      if (i < 0) foods.push({ ...op.record } as never)
      else foods[i] = { ...foods[i], ...op.record } as never
      return
    }
    const rows = (data.tables as unknown as Record<string, (LogRecord & Record<string, unknown>)[]>)[op.table]
    if (op.action === 'append') {
      if (!rows) return
      const i = rows.findIndex((r) => r.id === op.record.id)
      if (i < 0) rows.push({ ...op.record, ...mark } as never)
      else if (!pending) { const { __pending: _, ...rest } = rows[i]; rows[i] = rest as never }
      return
    }
    const patch = op.action === 'softDelete' ? { deleted: true } : op.patch
    if (rows) {
      const i = rows.findIndex((r) => r.id === op.id)
      if (i >= 0) { rows[i] = { ...rows[i], ...patch, ...mark }; return }
    }
    const extra = older[op.table]
    if (!extra) return
    const j = extra.findIndex((r) => r.id === op.id)
    if (j < 0) return
    extra[j] = { ...extra[j], ...patch, ...mark }
  }

  function absorbHistory(page: HistoryPage) {
    for (const [table, rows] of Object.entries(page.tables) as [LogTable, LogRecord[] | undefined][]) {
      if (!rows) continue
      const bucket = older[table] ?? []
      const ids = new Set(bucket.map((r) => r.id))
      for (const row of rows) if (!ids.has(row.id)) { bucket.push(row); ids.add(row.id) }
      older[table] = bucket
    }
  }

  function pruneOlder(snap: Snapshot) {
    for (const table of Object.keys(older) as LogTable[]) {
      const live = new Set((snap.tables[table] ?? []).map((r) => r.id))
      older[table] = (older[table] ?? []).filter((r) => !live.has(r.id))
    }
  }

  function view(snap: Snapshot): Snapshot {
    const clone = structuredClone(snap)
    if (!clone.tables.Care) clone.tables.Care = []
    for (const table of Object.keys(older) as LogTable[]) {
      const extra = older[table]
      if (!extra?.length) continue
      const rows = clone.tables[table] ?? []
      const ids = new Set(rows.map((r) => r.id))
      for (const row of extra) if (!ids.has(row.id)) rows.push(row)
      clone.tables[table] = rows
    }
    return applyPending(clone)
  }

  /** 把還沒送出的寫入套用到讀回來的資料，讓畫面立刻看得到 */
  function applyPending(data: Snapshot): Snapshot {
    for (const { qid: _q, queuedAt: _t, ...op } of getList<Queued>(K.outbox)) applyOp(data, op as WriteOp, true)
    return data
  }

  return {
    status,
    flush,
    onStatus(fn: (s: ApiStatus) => void) { listeners.add(fn); return () => { listeners.delete(fn) } },
    /** 目前的資料（上次讀取＋已送出＋待送），不發請求；還沒讀過就是 null */
    peek(): Snapshot | null { return lastData ? view(lastData) : null },
    hasFetchedBefore(before: string) { return fetchedBefores.has(before) },

    /** 讀近 N 天；離線時用上次快取（第一次就離線則是空資料）＋待送資料 */
    async load(days = 7): Promise<Snapshot> {
      await flush().catch(() => 0)
      try {
        const res = await adapter.call({ action: 'read', days })
        online = true
        if (isFail(res)) throw new ServerError(res.error, res.message)
        lastData = res as Snapshot
        if (!lastData.tables.Care) lastData.tables.Care = []
        pruneOlder(lastData)
        setRaw(K.cache, JSON.stringify(lastData))
      } catch (err) {
        if (!(err instanceof NetworkError)) throw err
        online = false
        lastData = lastData ?? (JSON.parse(getRaw(K.cache) || 'null') as Snapshot | null) ?? emptySnapshot(now())
        if (lastData && !lastData.tables.Care) lastData.tables.Care = []
      } finally {
        emit()
      }
      return view(lastData)
    },

    async history(args: { before: string; days?: number }): Promise<HistoryPage> {
      if (fetchedBefores.has(args.before)) {
        return { ok: true, tables: {}, from: args.before, before: args.before, hasMore: true }
      }
      fetchedBefores.add(args.before)
      try {
        const res = await adapter.call({ action: 'history', before: args.before, days: args.days })
        online = true
        if (isFail(res)) throw new ServerError(res.error, res.message)
        const page = res as unknown as HistoryPage
        absorbHistory(page)
        emit()
        return page
      } catch (err) {
        fetchedBefores.delete(args.before)
        if (err instanceof NetworkError) online = false
        throw err
      }
    },

    async getPhoto(fileId: string): Promise<{ mime: string; data: string }> {
      const res = await adapter.call({ action: 'getPhoto', fileId })
      if (isFail(res)) throw new ServerError(res.error, res.message)
      const ok = res as unknown as { mime: string; data: string }
      return { mime: ok.mime, data: ok.data }
    },

    /** 新增一筆紀錄；自動帶 id（可自己指定，方便立刻做「復原」）、ts（台北時間）、who */
    async log<T extends LogTable>(table: T, fields: NewRecord<T>, opts: { ts?: string; id?: string } = {}) {
      const record = { ...fields, id: opts.id ?? uuid(), ts: opts.ts ?? tpeIso(now()), who, deleted: false } as unknown as RecordOf<T>
      const { queued } = await write({ action: 'append', table, record })
      return { record, queued }
    },
    edit<T extends LogTable>(table: T, id: string, patch: Partial<RecordOf<T>>) {
      return write({ action: 'update', table, id, patch: patch as Record<string, unknown> })
    },
    remove(table: LogTable, id: string) { return write({ action: 'softDelete', table, id }) },
    restore(table: LogTable, id: string) { return write({ action: 'update', table, id, patch: { deleted: false } }) },
    setConfig(key: string, value: string | number | boolean) { return write({ action: 'setConfig', key, value }) },
    upsertFood(record: Partial<Food> & { food_id: string }) { return write({ action: 'upsertFood', record: record as Food & { food_id: string } }) },

    /** 照片不進佇列（檔案大）：離線時丟 NetworkError，由畫面提示稍後再傳 */
    async uploadPhoto(args: { base64: string; mime?: string; filename?: string }) {
      const res = await adapter.call({ action: 'uploadPhoto', data: args.base64, mime: args.mime ?? 'image/jpeg', filename: args.filename })
      if (isFail(res)) throw new ServerError(res.error, res.message)
      const ok = res as unknown as { fileId: string; url: string }
      return { fileId: ok.fileId, url: ok.url }
    },

    dismissFailed() { putList(K.failed, []); emit() },
    /** 把送出失敗的寫入放回佇列再送一次 */
    async retryFailed() {
      const failed = getList<FailedWrite>(K.failed)
      putList(K.failed, [])
      putList(K.outbox, [...getList(K.outbox), ...failed.map((f) => ({ ...f.op, qid: uuid(), queuedAt: f.queuedAt }))])
      emit()
      return flush()
    },
  }
}

export type Api = ReturnType<typeof createApi>
export { uuid }
