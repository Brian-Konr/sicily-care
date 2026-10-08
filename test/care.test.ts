import { test, expect } from 'vitest'
import type { CareEntry } from '@/types'
import { careStatus, careSummary, dueText, lastDoneLine } from '@/lib/care'

const NOW = new Date('2026-10-09T12:00:00+08:00')
const care = (p: Partial<CareEntry> & Pick<CareEntry, 'kind' | 'ts'>): CareEntry => ({
  id: p.id ?? p.kind, who: p.who ?? 'Mia', deleted: p.deleted ?? false, note: p.note ?? '', ...p,
})

test('dueText 文案', () => {
  expect(dueText(-2)).toBe('已逾期 2 天')
  expect(dueText(0)).toBe('今天到期')
  expect(dueText(1)).toBe('還有 1 天')
  expect(dueText(3)).toBe('還有 3 天')
  expect(dueText(4)).toBe('還有 4 天')
  expect(dueText(null)).toBe('還沒記錄過')
})

test('固定向量：2026-10-09、間隔 30', () => {
  const rows = [
    care({ kind: 'litter_wash', ts: '2026-09-07T12:00:00+08:00' }),
    care({ kind: 'feeder_clean', ts: '2026-09-11T12:00:00+08:00' }),
  ]
  const wash = careStatus(rows, 'litter_wash', 30, NOW)
  const clean = careStatus(rows, 'feeder_clean', 30, NOW)
  const des = careStatus(rows, 'feeder_desiccant', 30, NOW)
  expect(wash.daysLeft).toBe(-2)
  expect(dueText(wash.daysLeft)).toBe('已逾期 2 天')
  expect(clean.daysLeft).toBe(2)
  expect(dueText(clean.daysLeft)).toBe('還有 2 天')
  expect(des.daysLeft).toBeNull()
  expect(dueText(des.daysLeft)).toBe('還沒記錄過')
  expect(careSummary([wash, clean, des])).toBe('1 項已逾期・1 項快到期・1 項還沒記錄過')
})

test('日曆日邊界：23:30 仍算當天，隔日 00:30 到期', () => {
  const row = care({ kind: 'litter_wash', ts: '2026-10-09T23:30:00+08:00' })
  expect(careStatus([row], 'litter_wash', 1, new Date('2026-10-09T23:30:00+08:00')).daysLeft).toBe(1)
  expect(careStatus([row], 'litter_wash', 1, new Date('2026-10-10T00:30:00+08:00')).daysLeft).toBe(0)
})

test('軟刪除最新一筆後改用上一筆活著的', () => {
  const rows = [
    care({ id: 'old', kind: 'litter_wash', ts: '2026-09-07T12:00:00+08:00' }),
    care({ id: 'new', kind: 'litter_wash', ts: '2026-10-09T12:00:00+08:00' }),
  ]
  expect(careStatus(rows, 'litter_wash', 30, NOW).daysLeft).toBe(30)
  const undone = rows.map((r) => r.id === 'new' ? { ...r, deleted: true } : r)
  expect(careStatus(undone, 'litter_wash', 30, NOW).daysLeft).toBe(-2)
})

test('改間隔不寫到期日：30→40 讓 9/07 變成還有 8 天', () => {
  const rows = [care({ kind: 'litter_wash', ts: '2026-09-07T12:00:00+08:00' })]
  const at40 = careStatus(rows, 'litter_wash', 40, NOW)
  expect(at40.daysLeft).toBe(8)
  expect(dueText(at40.daysLeft)).toBe('還有 8 天')
  expect(careSummary([at40, { daysLeft: 2 }, { daysLeft: null }])).toBe('1 項快到期・1 項還沒記錄過')
})

test('今天記一筆：daysLeft 30、上次今天', () => {
  const st = careStatus([care({ kind: 'feeder_desiccant', ts: '2026-10-09T12:00:00+08:00', who: 'Mia' })], 'feeder_desiccant', 30, NOW)
  expect(st.daysLeft).toBe(30)
  expect(lastDoneLine(st.last, NOW)).toBe('上次：今天・Mia')
})

test('沒記過的上次文案', () => {
  expect(lastDoneLine(undefined, NOW)).toBe('點右邊的按鈕記第一次')
})
