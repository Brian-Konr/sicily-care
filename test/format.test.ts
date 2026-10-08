import { test, expect } from 'vitest'
import { fmtDayHeader, fmtDayLabel } from '@/lib/format'

const NOW = new Date('2026-10-09T12:00:00+08:00')

test('fmtDayHeader：今天／昨天／同年第幾月／跨年', () => {
  expect(fmtDayHeader('2026-10-09T12:00:00+08:00', NOW)).toBe('今天')
  expect(fmtDayHeader('2026-10-08T18:00:00+08:00', NOW)).toBe('昨天')
  expect(fmtDayHeader('2026-09-24T18:00:00+08:00', NOW)).toBe('9 月 24 日（四）')
  expect(fmtDayHeader('2025-12-31T18:00:00+08:00', NOW)).toBe('2025 年 12 月 31 日（三）')
})

test('fmtDayLabel 仍是短格式，沒被 fmtDayHeader 取代', () => {
  expect(fmtDayLabel('2026-09-24T18:00:00+08:00', NOW)).toBe('9/24（四）')
})
