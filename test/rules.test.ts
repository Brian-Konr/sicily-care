import { test, expect } from 'vitest'
import type { Config, FeedEntry, Food, MedEntry, WeightEntry } from '@/types'
import * as R from '@/lib/rules'
import { ageInMonths, catAgeLabel } from '@/lib/age'
import { addDays, toTaipeiISO } from '@/lib/format'
import { decodeConfig } from '@/data/codec'
import { DEFAULT_CONFIG } from '@/data/defaults'

const NOW = new Date('2026-09-26T18:00:00+08:00')
const ago = (min: number) => toTaipeiISO(new Date(NOW.getTime() - min * 60_000))
const cfg: Config = decodeConfig(DEFAULT_CONFIG, NOW)
const food = (id: string, kind: Food['kind']): Food => ({ food_id: id, name: id, brand: '', kind, unit: '罐', default_qty: 1, grams_per_unit: null, fav: false, active: true })
const foods = [food('a', '零食'), food('b', '零食'), food('c', '副食罐')]
const feed = (p: Partial<FeedEntry>): FeedEntry => ({ id: 'x', ts: ago(30), who: 'Mia', deleted: false, food_id: 'a', food_name: 'a', qty: 1, unit: '小撮', grams_est: null, eaten_pct: null, reaction: null, note: '', ...p })

test('台北時間與日期加減', () => {
  expect(toTaipeiISO(new Date('2026-09-26T00:30:00Z'))).toBe('2026-09-26T08:30:00+08:00')
  expect(addDays('2026-09-26', 90)).toBe('2026-12-25')
})

test('同類 2 小時內重複提醒；不同類、超過 2 小時、已撤銷都不提醒', () => {
  expect(R.findDuplicateFeed(foods[1], [feed({})], foods, NOW)?.who).toBe('Mia')
  expect(R.findDuplicateFeed(foods[2], [feed({})], foods, NOW)).toBeUndefined()
  expect(R.findDuplicateFeed(foods[1], [feed({ ts: ago(121) })], foods, NOW)).toBeUndefined()
  expect(R.findDuplicateFeed(foods[1], [feed({ deleted: true })], foods, NOW)).toBeUndefined()
})

test('待填剩食只算 24 小時內、未撤銷、eaten_pct 空白', () => {
  const xs = [feed({ id: '1' }), feed({ id: '2', eaten_pct: 100 }), feed({ id: '3', ts: ago(25 * 60) }), feed({ id: '4', deleted: true })]
  expect(R.pendingFeeds(xs, NOW).map((e) => e.id)).toEqual(['1'])
})

test('紅色獸醫警示：尿塊 0 且蹲很久/用力', () => {
  expect(R.needsVetNow(0, ['蹲很久/用力'])).toBe(true)
  expect(R.needsVetNow(1, ['蹲很久/用力'])).toBe(false)
  expect(R.needsVetNow(0, [])).toBe(false)
})

test('初始體重 3.5 kg：12 天前量的，距離建議還有 2 天；16 天前就逾期', () => {
  const w = (d: number): WeightEntry => ({ id: 'w', ts: ago(d * 1440), who: '初始資料', deleted: false, kg: 3.5, method: '寵物秤', note: '' })
  expect(R.weightSummary([w(12)], cfg, NOW)).toMatchObject({ dueInDays: 2, overdue: false, diff: null })
  expect(R.weightSummary([w(16)], cfg, NOW)?.overdue).toBe(true)
})

test('下次驅蟲／疫苗日期用設定的間隔；用藥沒有下次', () => {
  expect(R.autoNextDue('體內驅蟲', '2026-09-26', cfg)).toBe('2026-12-25')
  expect(R.autoNextDue('體外驅蟲', '2026-09-26', cfg)).toBe('2026-10-26')
  expect(R.autoNextDue('三合一疫苗', '2026-09-26', cfg)).toBe('2027-09-26')
  expect(R.autoNextDue('用藥', '2026-09-26', cfg)).toBeNull()
  const m = (kind: MedEntry['kind'], next_due: string, min: number): MedEntry => ({ id: kind + min, ts: ago(min), who: 'Brian', deleted: false, kind, product: 'p', dose: '', next_due, note: '' })
  const up = R.upcomingMeds([m('體內驅蟲', '2026-10-01', 100), m('體內驅蟲', '2026-09-01', 99999), m('體外驅蟲', '2026-09-20', 50)], NOW)
  expect(up.map((u) => [u.entry.kind, u.daysLeft])).toEqual([['體外驅蟲', -6], ['體內驅蟲', 5]])
})

test('生日推估 2025-11-01：約 10 個月；滿 12 個月後體重間隔改 30 天', () => {
  expect(ageInMonths('2025-11-01', NOW)).toBe(10)
  expect(catAgeLabel('2025-11-01', NOW)).toBe('約 10 個月')
  expect(decodeConfig(DEFAULT_CONFIG, NOW).weight_interval_days).toBe(14)
  expect(decodeConfig(DEFAULT_CONFIG, new Date('2026-11-02T12:00:00+08:00')).weight_interval_days).toBe(30)
})

test('診所沒填電話就不給撥號資訊', () => {
  expect(R.clinicFromConfig(cfg)).toBeUndefined()
  expect(R.clinicFromConfig({ clinic_name: '', clinic_phone: ' 02-1234 ', clinic_24h: true })).toEqual({ name: '動物醫院', phone: '02-1234', is24h: true })
})
