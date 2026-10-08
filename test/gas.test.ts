import { describe, test, expect } from 'vitest'
import { loadGas } from './gas-fakes'

const H = 3600e3
const iso = (msAgo: number) => {
  const t = new Date(Date.now() - msAgo + 8 * H).toISOString().slice(0, 19)
  return t + '+08:00'
}
function ready() {
  const env = loadGas()
  env.g.setupSicilyCare()
  // 初始資料（3 種食物、第一筆體重）另外在 defaults.test.ts 測；這裡清空，讓每個測試從空表開始
  env.sheets.get('Foods')!.data.splice(1)
  env.sheets.get('Weight')!.data.splice(1)
  const secret = env.props.get('SHARED_SECRET')!
  const call = (action: string, extra: Record<string, unknown> = {}) => env.post({ secret, action, ...extra })
  return { ...env, secret, call }
}

describe('setupSicilyCare', () => {
  test('建立 8 個分頁、表頭、預設 Config、照片資料夾與密鑰；刪掉空白工作表1', () => {
    const { sheets, props, folders, logs, g } = ready()
    expect([...sheets.keys()].sort()).toEqual(['Care', 'Config', 'Feed', 'Foods', 'Issue', 'Litter', 'Med', 'Weight'])
    expect(sheets.get('Care')!.data[0]).toEqual(['id', 'ts', 'who', 'deleted', 'kind', 'note'])
    for (const [name, cols] of Object.entries(g.SCHEMA as Record<string, string[]>)) {
      expect(sheets.get(name)!.data[0]).toEqual(cols)
      expect(sheets.get(name)!.frozen).toBe(1)
    }
    const cfg = Object.fromEntries(sheets.get('Config')!.data.slice(1))
    expect(cfg.users).toBe('Brian,Mia')
    expect(cfg.litter_clumping).toBe(true)
    expect(folders).toEqual(['西西里照片'])
    expect(props.get('SHARED_SECRET')).toMatch(/^[0-9a-f]{64}$/)
    expect(logs.join('\n')).toContain(props.get('SHARED_SECRET'))
  })

  test('重跑不會清資料、不重複 Config、不換密鑰；只補缺少的欄位', () => {
    const env = ready()
    env.call('append', { table: 'Weight', record: { id: 'w1', ts: iso(0), who: 'Brian', kg: 3.4 } })
    env.sheets.get('Weight')!.data[0].splice(4) // 模擬舊表頭少了欄位
    env.g.setupSicilyCare()
    expect(env.props.get('SHARED_SECRET')).toBe(env.secret)
    expect(env.sheets.get('Weight')!.data[0]).toEqual(['id', 'ts', 'who', 'deleted', 'kg', 'method', 'note'])
    expect(env.sheets.get('Weight')!.data).toHaveLength(2)
    expect(env.sheets.get('Config')!.data.filter((r) => r[0] === 'users')).toHaveLength(1)
    expect(env.sheets.get('Config')!.data.filter((r) => r[0] === 'litter_wash_int_days')).toHaveLength(1)
    expect(env.sheets.get('Config')!.data.filter((r) => r[0] === 'feeder_clean_int_days')).toHaveLength(1)
    expect(env.sheets.get('Config')!.data.filter((r) => r[0] === 'desiccant_int_days')).toHaveLength(1)
    expect(env.folders).toHaveLength(1)
  })
})

describe('doPost', () => {
  test('密鑰錯誤、缺少、長度不同都拒絕', () => {
    const { post, secret } = ready()
    expect(post({ secret: 'x'.repeat(64), action: 'read' }).error).toBe('unauthorized')
    expect(post({ action: 'read' }).error).toBe('unauthorized')
    expect(post({ secret: secret.slice(1), action: 'read' }).error).toBe('unauthorized')
  })

  test('壞 JSON、未知 action、未知分頁', () => {
    const { post, call } = ready()
    expect(post('{nope').error).toBe('bad_json')
    expect(call('dance').error).toBe('bad_action')
    expect(call('append', { table: 'Config', record: { id: 'a', ts: iso(0), who: 'Mia' } }).error).toBe('bad_table')
    expect(call('append', { table: 'Feed', record: { id: 'a' } }).error).toBe('bad_record')
  })

  test('append 寫入；同一個 id 重送不會重複（離線補送）', () => {
    const { call, sheets } = ready()
    const rec = { id: 'f1', ts: iso(H), who: 'Mia', food_id: 'churu', food_name: '啾嚕（示意）', qty: 1, unit: '條', reaction: ['liked'] }
    const r1 = call('append', { table: 'Feed', record: rec })
    expect(r1.ok).toBe(true)
    expect(r1.record.deleted).toBe(false)
    expect(r1.record.reaction).toBe('liked')
    expect(r1.record.ts).toBe(rec.ts)
    const r2 = call('append', { table: 'Feed', record: { ...rec, qty: 99 } })
    expect(r2.duplicate).toBe(true)
    expect(sheets.get('Feed')!.data).toHaveLength(2)
    expect(r2.record.qty).toBe(1)
  })

  test('update 補填 eaten_pct、可改時間，不能改 id/who；找不到回 not_found', () => {
    const { call } = ready()
    call('append', { table: 'Feed', record: { id: 'f1', ts: iso(H), who: 'Mia', qty: 1 } })
    const ts = iso(2 * H)
    const r = call('update', { table: 'Feed', id: 'f1', patch: { eaten_pct: 50, who: 'Brian', ts, id: 'zzz' } })
    expect(r.record).toMatchObject({ id: 'f1', who: 'Mia', ts, eaten_pct: 50 })
    expect(call('update', { table: 'Feed', id: 'nope', patch: {} }).error).toBe('not_found')
  })

  test('使用者在 Sheet 調換欄位順序後，寫入仍對到正確欄', () => {
    const { call, sheets } = ready()
    const sh = sheets.get('Weight')!
    sh.data[0] = ['kg', 'id', 'ts', 'who', 'deleted', 'note', 'method']
    call('append', { table: 'Weight', record: { id: 'w1', ts: iso(0), who: 'Brian', kg: 3.6, method: 'hold_diff' } })
    expect(sh.data[1][0]).toBe(3.6)
    expect(sh.data[1][6]).toBe('hold_diff')
    call('update', { table: 'Weight', id: 'w1', patch: { note: '飯後' } })
    expect(sh.data[1][5]).toBe('飯後')
  })

  test('softDelete 只標記，不刪列，read 仍回傳（deleted=true）；update deleted=false 可還原', () => {
    const { call, sheets } = ready()
    const rows = () => sheets.get('Weight')!.data.length
    const before = rows()
    call('append', { table: 'Weight', record: { id: 'w1', ts: iso(0), who: 'Brian', kg: 3.5 } })
    expect(call('softDelete', { table: 'Weight', id: 'w1' }).record.deleted).toBe(true)
    expect(rows()).toBe(before + 1)
    const w1 = () => call('read').tables.Weight.find((r: { id: string }) => r.id === 'w1')
    expect(w1().deleted).toBe(true)
    call('update', { table: 'Weight', id: 'w1', patch: { deleted: false } })
    expect(w1().deleted).toBe(false)
  })

  test('read 視窗：Feed/Litter 只回近 N 天；未解決異常一律帶回；Weight/Med 全回', () => {
    const { call } = ready()
    const D = 24 * H
    call('append', { table: 'Feed', record: { id: 'new', ts: iso(D), who: 'Mia' } })
    call('append', { table: 'Feed', record: { id: 'old', ts: iso(10 * D), who: 'Mia' } })
    call('append', { table: 'Issue', record: { id: 'open', ts: iso(30 * D), who: 'Brian', resolved: false } })
    call('append', { table: 'Issue', record: { id: 'closed', ts: iso(30 * D), who: 'Brian', resolved: true } })
    call('append', { table: 'Weight', record: { id: 'w', ts: iso(60 * D), who: 'Brian', kg: 2.9 } })
    const r = call('read')
    expect(r.days).toBe(7)
    expect(r.tables.Feed.map((x: any) => x.id)).toEqual(['new'])
    expect(r.tables.Issue.map((x: any) => x.id)).toEqual(['open'])
    expect(r.tables.Weight).toHaveLength(1)
    expect(call('read', { days: 14 }).tables.Feed).toHaveLength(2)
    expect(r.config.weight_interval_days).toBe(14)
    expect(r.config.litter_clumping).toBe(true)
  })

  test('setConfig 與 upsertFood 新增或覆寫', () => {
    const { call } = ready()
    call('setConfig', { key: 'users', value: 'Brian,Mia,Guest' })
    expect(call('read').config.users).toBe('Brian,Mia,Guest')
    call('upsertFood', { record: { food_id: 'k1', name: '凍乾（示意）', kind: 'snack', active: true } })
    call('upsertFood', { record: { food_id: 'k1', fav: true } })
    const foods = call('read').tables.Foods
    expect(foods).toHaveLength(1)
    expect(foods[0]).toMatchObject({ name: '凍乾（示意）', fav: true, active: true })
  })

  test('uploadPhoto 存進照片資料夾；拒絕錯誤格式與空資料', () => {
    const { call, files, props } = ready()
    const data = Buffer.from('fake-jpeg').toString('base64')
    const r = call('uploadPhoto', { filename: 'a/b:c.jpg', mime: 'image/jpeg', data })
    expect(r).toMatchObject({ ok: true, fileId: 'file-1' })
    expect(files[0]).toMatchObject({ name: 'a_b_c.jpg', folder: props.get('PHOTO_FOLDER_ID') })
    expect(call('uploadPhoto', { mime: 'application/pdf', data }).error).toBe('bad_photo')
    expect(call('uploadPhoto', {}).error).toBe('bad_photo')
  })

  test('拿不到鎖時回 busy（前端會重試）', () => {
    const env = loadGas({ lockBusy: true })
    env.g.setupSicilyCare()
    const r = env.post({ secret: env.props.get('SHARED_SECRET'), action: 'append', table: 'Weight', record: { id: 'w', ts: iso(0), who: 'Mia' } })
    expect(r.error).toBe('busy')
  })

  test('GET 沒帶密鑰只回健康檢查', () => {
    const { get } = ready()
    expect(get({})).toEqual({ ok: true, service: 'sicily-care', version: 2 })
    expect(get({ secret: 'bad' }).error).toBe('unauthorized')
  })
})

describe('v1.1 Care / history / getPhoto', () => {
  const D = 24 * H
  const BEFORE = '2026-10-09T00:00:00+08:00'
  const beforeMs = Date.parse(BEFORE)

  test('read 回 version 2；40 天前的 Care 仍在；10 天前的 Feed 不在 7 天視窗；已撤銷 Care 也帶回', () => {
    const { call } = ready()
    call('append', { table: 'Care', record: { id: 'c-old', ts: iso(40 * D), who: 'Brian', kind: 'litter_wash', note: '' } })
    call('append', { table: 'Care', record: { id: 'c-del', ts: iso(2 * D), who: 'Mia', kind: 'feeder_clean', note: '' } })
    call('softDelete', { table: 'Care', id: 'c-del' })
    call('append', { table: 'Feed', record: { id: 'f-old', ts: iso(10 * D), who: 'Mia' } })
    const r = call('read')
    expect(r.version).toBe(2)
    expect(r.tables.Care.map((x: { id: string }) => x.id).sort()).toEqual(['c-del', 'c-old'])
    expect(r.tables.Care.find((x: { id: string }) => x.id === 'c-del').deleted).toBe(true)
    expect(r.tables.Feed.map((x: { id: string }) => x.id)).not.toContain('f-old')
  })

  test('history 半開視窗、hasMore、預設 30 天、上限 90、省略 tables 含 Care', () => {
    const { call } = ready()
    const fromMs = beforeMs - 30 * D
    const FROM = '2026-09-09T00:00:00+08:00'
    expect(Date.parse(FROM)).toBe(fromMs)
    call('append', { table: 'Care', record: { id: 'edge-before', ts: BEFORE, who: 'Brian', kind: 'litter_wash' } })
    call('append', { table: 'Care', record: { id: 'edge-from', ts: FROM, who: 'Brian', kind: 'feeder_clean' } })
    call('append', { table: 'Care', record: { id: 'before-from', ts: '2026-09-08T23:59:59+08:00', who: 'Brian', kind: 'feeder_desiccant' } })
    call('append', { table: 'Care', record: { id: 'in-win-del', ts: '2026-09-20T12:00:00+08:00', who: 'Mia', kind: 'litter_wash' } })
    call('softDelete', { table: 'Care', id: 'in-win-del' })

    const r = call('history', { before: BEFORE, days: 30 })
    expect(r.ok).toBe(true)
    expect(r.version).toBe(2)
    expect(Date.parse(r.from)).toBe(fromMs)
    expect(Date.parse(r.before)).toBe(beforeMs)
    expect(r.tables.Care.map((x: { id: string }) => x.id)).not.toContain('edge-before')
    expect(r.tables.Care.map((x: { id: string }) => x.id)).toContain('edge-from')
    expect(r.tables.Care.map((x: { id: string }) => x.id)).not.toContain('before-from')
    expect(r.hasMore).toBe(true)
    expect(r.tables.Care.find((x: { id: string }) => x.id === 'in-win-del').deleted).toBe(true)
    expect(Object.keys(r.tables).sort()).toEqual(['Care', 'Feed', 'Issue', 'Litter', 'Med', 'Weight'])

    const omitted = call('history', { before: BEFORE })
    expect(Date.parse(omitted.from)).toBe(fromMs)

    const capped = call('history', { before: BEFORE, days: 100 })
    expect(Date.parse(capped.from)).toBe(beforeMs - 90 * D)

    expect(call('history', { days: 30 }).error).toBe('bad_record')
    expect(call('history', { before: BEFORE, tables: ['Nope'] }).error).toBe('bad_table')
  })

  test('拿不到鎖時 history 與 getPhoto 仍可用，append 回 busy', () => {
    const env = loadGas({ lockBusy: true })
    env.g.setupSicilyCare()
    const secret = env.props.get('SHARED_SECRET')!
    const post = (body: Record<string, unknown>) => env.post({ secret, ...body })
    expect(post({ action: 'append', table: 'Weight', record: { id: 'w', ts: iso(0), who: 'Mia' } }).error).toBe('busy')
    expect(post({ action: 'history', before: BEFORE, days: 30 }).ok).toBe(true)
    expect(post({ action: 'getPhoto', fileId: 'missing' }).error).toBe('forbidden')
  })

  test('getPhoto 讀得到自己上傳的檔；外來與未知 id 是 forbidden；缺少 fileId 是 bad_record', () => {
    const env = ready()
    const bytes = [...Buffer.from('fake-jpeg')]
    const data = Buffer.from(bytes).toString('base64')
    const up = env.call('uploadPhoto', { filename: 'a.jpg', mime: 'image/jpeg', data })
    const got = env.call('getPhoto', { fileId: up.fileId })
    expect(got.ok).toBe(true)
    expect(got.mime).toBe('image/jpeg')
    expect([...Buffer.from(got.data, 'base64')]).toEqual(bytes)

    env.files.push({ id: 'foreign', folder: 'somewhere-else', mime: 'image/jpeg', bytes, name: 'x.jpg' })
    expect(env.call('getPhoto', { fileId: 'foreign' }).error).toBe('forbidden')
    expect(env.call('getPhoto', { fileId: 'unknown' }).error).toBe('forbidden')
    expect(env.call('getPhoto', {}).error).toBe('bad_record')
  })

  test('append Care 拒絕未知 kind；同一個有效 id 重送是 duplicate', () => {
    const { call, sheets } = ready()
    expect(call('append', { table: 'Care', record: { id: 'c1', ts: iso(0), who: 'Mia', kind: 'nope' } }).error).toBe('bad_record')
    const rec = { id: 'c1', ts: iso(0), who: 'Mia', kind: 'litter_wash', note: '' }
    expect(call('append', { table: 'Care', record: rec }).ok).toBe(true)
    const again = call('append', { table: 'Care', record: rec })
    expect(again.duplicate).toBe(true)
    expect(sheets.get('Care')!.data).toHaveLength(2)
  })
})
