// 年齡顯示（src/lib/age.ts）。app 也可以直接把這個檔案放進 app/test/。
import { describe, expect, test } from 'vitest'
import { ageInMonths, ageParts, catAgeLabel, resolveBirthdayEstimated } from '@/lib/age'

/** 台北時間某天的晚上（避開 UTC 換日） */
const on = (ymd: string) => new Date(`${ymd}T21:30:00+08:00`)
const exact = (b: string, today: string) => catAgeLabel(b, on(today), false)
const est = (b: string, today: string) => catAgeLabel(b, on(today), true)

describe('確切生日', () => {
  test('未滿 1 個月只顯示天數', () => {
    expect(exact('2026-09-14', '2026-09-26')).toBe('12 天')
    expect(exact('2026-09-26', '2026-09-26')).toBe('0 天')
    expect(exact('2026-08-27', '2026-09-26')).toBe('30 天')
  })
  test('未滿 1 歲：X 個月 Y 天；0 天只寫月', () => {
    expect(exact('2025-11-01', '2026-09-26')).toBe('10 個月 25 天')
    expect(exact('2025-11-26', '2026-09-26')).toBe('10 個月')
    expect(exact('2025-10-18', '2026-09-26')).toBe('11 個月 8 天')
    expect(exact('2025-09-27', '2026-09-26')).toBe('11 個月 30 天')
  })
  test('滿 1 歲：N 歲 X 個月（不顯示天數）；0 個月只寫歲', () => {
    expect(exact('2025-09-26', '2026-09-26')).toBe('1 歲')
    expect(exact('2025-09-01', '2026-09-26')).toBe('1 歲')
    expect(exact('2024-06-10', '2026-09-26')).toBe('2 歲 3 個月')
    expect(exact('2024-06-30', '2026-09-26')).toBe('2 歲 2 個月')
  })
  test('日曆月：月底出生夾到月底', () => {
    expect(ageParts('2026-01-31', on('2026-02-28'))).toMatchObject({ totalMonths: 1, days: 0 })
    expect(exact('2026-01-31', '2026-02-27')).toBe('27 天')
    expect(exact('2026-01-31', '2026-02-28')).toBe('1 個月')
    expect(exact('2026-01-31', '2026-03-01')).toBe('1 個月 1 天')
    expect(exact('2026-01-31', '2026-03-31')).toBe('2 個月')
    expect(exact('2024-01-31', '2024-02-29')).toBe('1 個月') // 閏年
    expect(exact('2024-02-29', '2025-02-28')).toBe('1 歲') // 閏日出生，平年 2/28 滿 1 歲
    expect(exact('2025-12-15', '2026-01-14')).toBe('30 天') // 跨年
    expect(exact('2025-12-15', '2026-01-15')).toBe('1 個月')
  })
})

describe('估計生日：加「約」、不顯示天數', () => {
  test('例子', () => {
    expect(est('2025-11-01', '2026-09-26')).toBe('約 10 個月')
    expect(est('2025-09-26', '2026-09-26')).toBe('約 1 歲')
    expect(est('2024-06-10', '2026-09-26')).toBe('約 2 歲 3 個月')
    expect(est('2026-09-14', '2026-09-26')).toBe('未滿 1 個月')
  })
  test('沒傳 estimated 時預設當估計（寧可少講精度）', () => {
    expect(catAgeLabel('2025-11-01', on('2026-09-26'))).toBe('約 10 個月')
  })
})

describe('無效輸入不當機、不出現負數', () => {
  test.each(['', '2025-13-01', '2025-02-30', 'abc', '2026-09-27', '2030-01-01'])('%s → 空字串', (b) => {
    expect(exact(b, '2026-09-26')).toBe('')
    expect(est(b, '2026-09-26')).toBe('')
    expect(ageInMonths(b, on('2026-09-26'))).toBe(0)
  })
  test('undefined／null 也不會當', () => {
    expect(catAgeLabel(undefined as unknown as string, on('2026-09-26'), false)).toBe('')
    expect(catAgeLabel(null as unknown as string, on('2026-09-26'))).toBe('')
  })
  test('Sheet 讀回帶時間的日期也能算', () => {
    expect(exact('2025-11-01T00:00:00+08:00', '2026-09-26')).toBe('10 個月 25 天')
  })
})

describe('ageInMonths（app 用來判斷滿 1 歲改體重間隔）', () => {
  test('日曆月', () => {
    expect(ageInMonths('2025-11-01', on('2026-09-26'))).toBe(10)
    expect(ageInMonths('2025-11-01', on('2026-10-31'))).toBe(11)
    expect(ageInMonths('2025-11-01', on('2026-11-01'))).toBe(12)
  })
})

describe('resolveBirthdayEstimated：舊資料沒有旗標時的推定', () => {
  const SEED = '2025-11-01'
  test('有存就照存的（Sheet 的 TRUE/FALSE 字串或布林）', () => {
    expect(resolveBirthdayEstimated('TRUE', '2025-10-18', SEED)).toBe(true)
    expect(resolveBirthdayEstimated(false, SEED, SEED)).toBe(false)
    expect(resolveBirthdayEstimated('FALSE', SEED, SEED)).toBe(false)
  })
  test('沒存：還是種子日期 → 估計；使用者改過的日期 → 確切', () => {
    expect(resolveBirthdayEstimated(undefined, SEED, SEED)).toBe(true)
    expect(resolveBirthdayEstimated('', '2025-11-01T00:00:00+08:00', SEED)).toBe(true)
    expect(resolveBirthdayEstimated(undefined, '2025-10-18', SEED)).toBe(false)
    expect(resolveBirthdayEstimated(null, '', SEED)).toBe(false)
  })
})
