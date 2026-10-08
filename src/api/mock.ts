// 本機假資料介面卡：行為跟 Apps Script 後端一致（同樣的 action 與回應格式），資料存在 localStorage。
// 起始資料是正式的初始資料（src/data/defaults.ts），不含編造的紀錄。
import type { RawConfig, RawFood, LogTable, Snapshot } from './sheet'
import { DEFAULT_CONFIG, DEFAULT_FOODS, INITIAL_WEIGHT } from '@/data/defaults'
import { tpeIso } from './time'
import { NetworkError } from './errors'
import type { Adapter, Op, Response } from './types'

const CARE_KINDS = ['litter_wash', 'feeder_clean', 'feeder_desiccant']
const WINDOWED: LogTable[] = ['Feed', 'Litter', 'Issue']

const SCHEMA_KEYS: Record<LogTable, string[]> = {
  Feed: ['id', 'ts', 'who', 'deleted', 'food_id', 'food_name', 'qty', 'unit', 'grams_est', 'eaten_pct', 'reaction', 'note'],
  Litter: ['id', 'ts', 'who', 'deleted', 'all_normal', 'urine_count', 'urine_size', 'urine_flags', 'stool_count', 'stool_cat',
    'purina_range', 'stool_amount', 'stool_flags', 'photo_ids', 'note'],
  Weight: ['id', 'ts', 'who', 'deleted', 'kg', 'method', 'note'],
  Med: ['id', 'ts', 'who', 'deleted', 'kind', 'product', 'dose', 'next_due', 'note'],
  Issue: ['id', 'ts', 'who', 'deleted', 'category', 'sub', 'severity', 'photo_ids', 'photo_urls', 'note', 'resolved'],
  Care: ['id', 'ts', 'who', 'deleted', 'kind', 'note'],
}
const LOG_TABLES = Object.keys(SCHEMA_KEYS) as LogTable[]
type Row = Record<string, unknown>
type Db = Record<LogTable, Row[]> & { Foods: RawFood[]; Config: RawConfig }

export { DEFAULT_CONFIG }

/** 本機試用的起始資料＝正式初始資料（Foods 預設清單、第一筆體重、Config），沒有編造的紀錄 */
export function seedData(): Db {
  return {
    Foods: DEFAULT_FOODS.map((f) => ({ ...f })),
    Config: { ...DEFAULT_CONFIG },
    Feed: [], Litter: [], Weight: [{ ...INITIAL_WEIGHT }], Med: [], Issue: [], Care: [],
  }
}

export interface MockAdapter extends Adapter {
  setOffline(v: boolean): void
  reset(): void
}

export function createMockAdapter(opts: { storage?: Storage; key?: string; now?: () => number; latencyMs?: number } = {}): MockAdapter {
  const { storage, key = 'sicily.mockdb', now = () => Date.now(), latencyMs = 0 } = opts
  let offline = false
  let photoSeq = 0
  let memory: Db | null = null
  const photos = new Map<string, { mime: string; data: string }>()
  const save = (db: Db) => { memory = db; storage?.setItem(key, JSON.stringify(db)) }
  const load = (): Db => {
    const raw = storage ? storage.getItem(key) : memory && JSON.stringify(memory)
    const db = raw ? JSON.parse(raw) as Db : seedData()
    if (!db.Care) db.Care = []
    if (!raw) save(db)
    return db
  }
  const pick = (table: LogTable, rec: Row): Row => Object.fromEntries(SCHEMA_KEYS[table].map((k) => [k, rec[k] ?? '']))
  const bad = (error: string, message?: string): Response => ({ ok: false, error, message })

  function handle(op: Op, db: Db): Response {
    switch (op.action) {
      case 'read': {
        const days = Math.min(Math.max(Number(op.days) || 7, 1), 90)
        const since = now() - days * 86400000
        const tables = {} as Snapshot['tables']
        for (const t of LOG_TABLES) {
          ;(tables as unknown as Record<string, Row[]>)[t] = db[t].filter((r) => {
            if (!WINDOWED.includes(t)) return true
            if (t === 'Issue' && !r.resolved && !r.deleted) return true
            return Date.parse(String(r.ts)) >= since
          })
        }
        tables.Foods = db.Foods
        return { ok: true, version: 2, days, serverTime: tpeIso(now()), tables, config: db.Config }
      }
      case 'append': {
        if (!LOG_TABLES.includes(op.table)) return bad('bad_table', op.table)
        const r = op.record as unknown as Row
        if (!r.id || !r.ts || !r.who) return bad('bad_record', '缺少 id、ts 或 who')
        if (op.table === 'Care') {
          if (!r.kind) return bad('bad_record', '缺少 kind')
          if (!CARE_KINDS.includes(String(r.kind))) return bad('bad_record', 'kind 只能是指定的居家維護項目')
        }
        const existing = db[op.table].find((x) => x.id === r.id)
        if (existing) return { ok: true, duplicate: true, record: existing }
        const row = pick(op.table, { ...r, deleted: !!r.deleted })
        db[op.table].push(row)
        return { ok: true, record: row }
      }
      case 'update':
      case 'softDelete': {
        if (!LOG_TABLES.includes(op.table)) return bad('bad_table', op.table)
        const row = db[op.table].find((x) => x.id === op.id)
        if (!row) return bad('not_found', op.id)
        const patch = op.action === 'softDelete' ? { deleted: true } : op.patch
        if (op.table === 'Care' && patch && 'kind' in patch && patch.kind !== undefined && patch.kind !== '') {
          if (!CARE_KINDS.includes(String(patch.kind))) return bad('bad_record', 'kind 只能是指定的居家維護項目')
        }
        for (const [k, v] of Object.entries(patch)) {
          if (['id', 'who'].includes(k) || !SCHEMA_KEYS[op.table].includes(k)) continue
          row[k] = v
        }
        return { ok: true, record: row }
      }
      case 'setConfig':
        ;db.Config[op.key] = op.value
        return { ok: true }
      case 'upsertFood': {
        const i = db.Foods.findIndex((f) => f.food_id === op.record.food_id)
        if (i >= 0) db.Foods[i] = { ...db.Foods[i], ...op.record }
        else db.Foods.push(op.record)
        return { ok: true, record: op.record }
      }
      case 'uploadPhoto': {
        if (!op.data) return bad('bad_photo', '缺少照片資料')
        photoSeq += 1
        const fileId = `mock-photo-${photoSeq}`
        photos.set(fileId, { mime: op.mime || 'image/jpeg', data: op.data })
        return { ok: true, fileId, url: '' }
      }
      case 'getPhoto': {
        if (!op.fileId) return bad('bad_record', '缺少照片')
        const p = photos.get(op.fileId)
        if (!p) return bad('forbidden', '讀不到這張照片')
        return { ok: true, mime: p.mime, data: p.data }
      }
      case 'history': {
        const beforeMs = Date.parse(op.before)
        if (!Number.isFinite(beforeMs)) return bad('bad_record', '缺少有效的 before')
        const days = Math.min(90, Math.max(1, parseInt(String(op.days ?? ''), 10) || 30))
        const fromMs = beforeMs - days * 86400000
        let names = op.tables
        if (names === undefined || (Array.isArray(names) && names.length === 0)) names = [...LOG_TABLES]
        else if (!Array.isArray(names)) return bad('bad_record', 'tables 格式不對')
        for (const t of names) {
          if (!LOG_TABLES.includes(t as LogTable)) return bad('bad_table', t)
        }
        const tables: Record<string, Row[]> = {}
        let hasMore = false
        for (const t of names) {
          tables[t] = db[t as LogTable].filter((r) => {
            const ts = Date.parse(String(r.ts))
            if (!Number.isFinite(ts)) return false
            if (ts < fromMs) { hasMore = true; return false }
            return ts < beforeMs
          })
        }
        return { ok: true, version: 2, tables, from: tpeIso(fromMs), before: tpeIso(beforeMs), hasMore }
      }
      default:
        return bad('bad_action', (op as { action: string }).action)
    }
  }

  return {
    kind: 'mock',
    setOffline(v) { offline = v },
    reset() { memory = null; storage?.removeItem(key) },
    async call(op) {
      if (latencyMs) await new Promise((r) => setTimeout(r, latencyMs))
      if (offline) throw new NetworkError()
      const db = load()
      const res = handle(op, db)
      save(db)
      return JSON.parse(JSON.stringify(res)) as Response
    },
  }
}
