import { test, expect } from 'vitest'
import { configChanges, decode, decodeConfig, decodeSnapshot, encodeFields } from '@/data/codec'
import { DEFAULT_CONFIG, DEFAULT_FOODS, INITIAL_WEIGHT } from '@/data/defaults'
import type { Snapshot } from '@/api/sheet'

const NOW = new Date('2026-09-26T18:00:00+08:00')
const none = new Set<string>()

test('寫入：陣列變逗號字串、null 變空白、前端欄位拿掉', () => {
  expect(encodeFields({ urine_flags: ['蹲很久/用力', '尿在盆外'], stool_cat: null, sync: 'queued', type: 'litter', note: '', x: undefined }))
    .toEqual({ urine_flags: '蹲很久/用力,尿在盆外', stool_cat: '', note: '' })
})

test('讀取：Sheet 自動轉型的值都還原成畫面型別', () => {
  const l = decode.Litter({ id: 'l', ts: '2026-09-26T08:00:00+08:00', who: 'Mia', deleted: 'FALSE', all_normal: 'TRUE', urine_count: '0',
    urine_size: '', urine_flags: '蹲很久/用力, 尿在盆外', stool_count: 1, stool_cat: '正常成形', purina_range: 2, stool_amount: '', stool_flags: '', photo_ids: '', note: '' }, none)
  expect(l).toMatchObject({ deleted: false, all_normal: true, urine_count: 0, urine_size: null, urine_flags: ['蹲很久/用力', '尿在盆外'], stool_flags: [], purina_range: '2', sync: 'synced' })
  const m = decode.Med({ id: 'm', ts: 't', who: 'Brian', deleted: false, kind: '體內驅蟲', product: 'p', dose: '', next_due: '2026-12-25T00:00:00+08:00', note: '' }, new Set(['m']))
  expect([m.next_due, m.sync]).toEqual(['2026-12-25', 'failed'])
  const f = decode.Feed({ id: 'f', ts: 't', who: 'Mia', deleted: true, eaten_pct: '', reaction: '喜歡', qty: '', __pending: true }, none)
  expect([f.eaten_pct, f.reaction, f.qty, f.deleted, f.sync]).toEqual([null, '喜歡', 1, true, 'queued'])
})

test('Config：生日可能被 Sheet 轉成時間；間隔轉成每種類型的天數', () => {
  const c = decodeConfig({ ...DEFAULT_CONFIG, birthday_est: '2025-11-01T00:00:00+08:00', clinic_24h: 'TRUE' }, NOW)
  expect(c.birthday_est).toBe('2025-11-01')
  expect(c.clinic_24h).toBe(true)
  expect(c.med_interval_days).toEqual({ 體內驅蟲: 90, 體外驅蟲: 30, 內外同驅: 30, 三合一疫苗: 365, 狂犬病疫苗: 365 })
})

test('設定頁存檔只送有變的 key；改過間隔就不再標示意', () => {
  const cur = decodeConfig(DEFAULT_CONFIG, NOW)
  expect(configChanges({ ...cur, clinic_phone: '02-1234' }, DEFAULT_CONFIG)).toEqual([['clinic_phone', '02-1234']])
  expect(configChanges({ ...cur, med_interval_days: { ...cur.med_interval_days, 體外驅蟲: 28 } }, DEFAULT_CONFIG))
    .toEqual([['ext_deworm_int_days', 28], ['intervals_are_sample', false]])
})

test('初始資料解碼：3 種食物、第一筆體重 3.5 kg、名字 Brian/Mia、間隔仍是示意', () => {
  const s: Snapshot = { ok: true, days: 7, serverTime: '', config: { ...DEFAULT_CONFIG },
    tables: { Feed: [], Litter: [], Weight: [{ ...INITIAL_WEIGHT }], Med: [], Issue: [], Foods: DEFAULT_FOODS.map((f) => ({ ...f })) } } as never
  const d = decodeSnapshot(s, NOW)
  expect(d.foods.map((f) => [f.name, f.fav])).toEqual([['Hello Fresh 鯖魚', true], ['Hello Fresh 鮪魚雞肉', false], ['雞肉絲', false]])
  expect(d.weights[0]).toMatchObject({ kg: 3.5, method: '寵物秤' })
  expect(d.users).toEqual(['Brian', 'Mia'])
  expect(d.intervalsAreSample).toBe(true)
  expect(d.all.map((e) => e.type)).toEqual(['weight'])
})

test('生日是否估計：舊資料沒有旗標時的推定與寫回', () => {
  const seed = decodeConfig(DEFAULT_CONFIG, NOW)
  expect(seed.birthday_estimated).toBe(true)
  // Brian 之前在設定頁存過確切生日（舊版沒有旗標）→ 更新後直接算確切
  const saved = { ...DEFAULT_CONFIG, birthday_est: '2025-10-18T00:00:00+08:00' }
  expect(decodeConfig(saved, NOW).birthday_estimated).toBe(false)
  expect(decodeConfig({ ...saved, birthday_estimated: 'TRUE' }, NOW).birthday_estimated).toBe(true)
  // 只改診所電話：不寫旗標
  expect(configChanges({ ...seed, clinic_phone: '02-1234' }, DEFAULT_CONFIG)).toEqual([['clinic_phone', '02-1234']])
  // 改日期（Switch 自動關）：生日＋旗標一起寫
  expect(configChanges({ ...seed, birthday_est: '2025-10-18', birthday_estimated: false }, DEFAULT_CONFIG))
    .toEqual([['birthday_est', '2025-10-18'], ['birthday_estimated', false]])
  // 只切 Switch
  expect(configChanges({ ...seed, birthday_estimated: false }, DEFAULT_CONFIG)).toEqual([['birthday_estimated', false]])
})
