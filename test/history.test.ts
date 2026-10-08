import { test, expect } from 'vitest'
import { countMatching, firstBefore, matchesFilter, mergeRows, nextFilters } from '@/lib/history'

test('nextFilters：點清砂會關掉全部；點全部會清空；關掉最後一顆回到全部', () => {
  expect(nextFilters([], ['全部', '清砂'])).toEqual(['清砂'])
  expect(nextFilters(['清砂'], ['全部', '清砂'])).toEqual([])
  expect(nextFilters(['清砂'], [])).toEqual([])
  expect(nextFilters(['清砂', '異常'], ['清砂'])).toEqual(['清砂'])
})

test('matchesFilter：空陣列＝全部', () => {
  expect(matchesFilter('feed', [])).toBe(true)
  expect(matchesFilter('litter', ['清砂'])).toBe(true)
  expect(matchesFilter('feed', ['清砂'])).toBe(false)
  expect(matchesFilter('care', ['居家維護'])).toBe(true)
})

test('firstBefore 用毫秒窗，不是日曆日', () => {
  expect(firstBefore('2026-10-09T00:00:00+08:00', 30, new Date())).toBe('2026-09-09T00:00:00+08:00')
  expect(firstBefore('not-a-date', 7, new Date('2026-10-09T12:00:00+08:00'))).toBe('2026-10-02T12:00:00+08:00')
})

test('mergeRows 不重複 id；已有的頁不會增加可見筆數', () => {
  const a = [{ id: '1', type: 'feed' as const }, { id: '2', type: 'litter' as const }]
  const page = [{ id: '2', type: 'litter' as const }, { id: '1', type: 'feed' as const }]
  const merged = mergeRows(a, page)
  expect(merged).toHaveLength(2)
  expect(countMatching(merged, [])).toBe(countMatching(a, []))
})

test('下一頁的 before 用 page.from，不再重算日期', () => {
  const page = { from: '2026-09-09T00:00:00+08:00', before: '2026-10-09T00:00:00+08:00' }
  const nextBefore = page.from
  expect(nextBefore).toBe('2026-09-09T00:00:00+08:00')
  expect(nextBefore).not.toBe(firstBefore('2026-10-09T12:00:00+08:00', 30, new Date('2026-10-09T12:00:00+08:00')))
})
