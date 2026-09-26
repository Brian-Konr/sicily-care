/** 純函式：由（估計）生日算年齡，一律加「約」。 */
import { dateKey } from "@/lib/format"

/** 完整月數（台北日期），例如 2025-11-01 → 2026-09-26 ＝ 10 */
export function ageInMonths(birthdayKey: string, now: Date): number {
  const [by, bm, bd] = birthdayKey.split("-").map(Number)
  const [ny, nm, nd] = dateKey(now).split("-").map(Number)
  let m = (ny - by) * 12 + (nm - bm)
  if (nd < bd) m -= 1
  return Math.max(0, m)
}

/** 約 10 個月／約 1 歲 2 個月／約 3 週／約 2 歲 */
export function catAgeLabel(birthdayKey: string, now: Date): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdayKey)) return ""
  const m = ageInMonths(birthdayKey, now)
  if (m < 1) {
    const days = Math.floor((Date.parse(dateKey(now)) - Date.parse(birthdayKey)) / 86_400_000)
    return days < 0 ? "" : `約 ${Math.max(1, Math.floor(days / 7))} 週`
  }
  if (m < 12) return `約 ${m} 個月`
  const y = Math.floor(m / 12), r = m % 12
  return r ? `約 ${y} 歲 ${r} 個月` : `約 ${y} 歲`
}
