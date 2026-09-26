/**
 * 純函式：由生日算貓的年齡（台北日期、日曆算法）。
 *
 * - 月數用「日曆月」：從出生日一次加整個月，遇到月底夾到該月最後一天（1/31 出生 → 2/28 算滿 1 個月），
 *   不是 30 天一個月。天數＝今天減去「出生日＋滿的月數」。
 * - 確切生日（birthday_estimated=false）：未滿 1 個月「12 天」；未滿 1 歲「10 個月 25 天」（0 天只寫「10 個月」）；
 *   滿 1 歲「1 歲 2 個月」（0 個月只寫「1 歲」）。滿 1 歲後不顯示天數（太細，對照顧沒幫助）。
 * - 估計生日（birthday_estimated=true）：前面加「約」，而且**不顯示比來源更精細的單位**（DESIGN.md §10）：
 *   估計值本來就只準到月，所以不顯示天數——「約 10 個月」「約 1 歲 2 個月」；未滿 1 個月寫「未滿 1 個月」。
 * - 生日沒填、格式錯、日期不存在或在未來：回傳空字串（畫面就不顯示年齡），不會出現負數。
 */
import { dateKey } from "@/lib/format"

export interface AgeParts {
  /** 滿幾個月（日曆月，總數，例如 14） */
  totalMonths: number
  years: number
  /** 滿歲之後剩下的月數 0–11 */
  months: number
  /** 滿月之後剩下的天數 */
  days: number
}

type Ymd = [number, number, number]

function parseYmd(key: string): Ymd | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key ?? "")
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const t = new Date(Date.UTC(y, mo - 1, d))
  // 擋掉 2025-02-30 這種不存在的日期
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null
  return [y, mo, d]
}

const daysInMonth = (y: number, mo: number) => new Date(Date.UTC(y, mo, 0)).getUTCDate()
const utc = ([y, mo, d]: Ymd) => Date.UTC(y, mo - 1, d)

/** 出生日加 n 個日曆月；日期超過該月天數時夾到月底 */
function addMonths([y, mo, d]: Ymd, n: number): Ymd {
  const idx = y * 12 + (mo - 1) + n
  const ny = Math.floor(idx / 12), nm = (idx % 12) + 1
  return [ny, nm, Math.min(d, daysInMonth(ny, nm))]
}

/** 年齡拆成 年／月／天；生日無效或在未來時回傳 null */
export function ageParts(birthdayKey: string, now: Date): AgeParts | null {
  const b = parseYmd(birthdayKey)
  const t = parseYmd(dateKey(now))
  if (!b || !t || utc(t) < utc(b)) return null
  let m = (t[0] - b[0]) * 12 + (t[1] - b[1])
  if (utc(addMonths(b, m)) > utc(t)) m -= 1
  const days = Math.round((utc(t) - utc(addMonths(b, m))) / 86_400_000)
  return { totalMonths: m, years: Math.floor(m / 12), months: m % 12, days }
}

/** 滿幾個月（日曆月），例如 2025-11-01 → 2026-09-26 ＝ 10。無效或未來的生日回傳 0 */
export function ageInMonths(birthdayKey: string, now: Date): number {
  return ageParts(birthdayKey, now)?.totalMonths ?? 0
}

/**
 * 首頁／設定頁顯示的年齡文字。
 * estimated 預設 true：不知道是不是確切生日時，寧可少講精度（顯示「約」、不顯示天數）。
 *
 * 確切：「12 天」「10 個月 25 天」「10 個月」「1 歲」「2 歲 3 個月」
 * 估計：「未滿 1 個月」「約 10 個月」「約 1 歲」「約 2 歲 3 個月」
 */
export function catAgeLabel(birthdayKey: string, now: Date, estimated = true): string {
  const a = ageParts(birthdayKey, now)
  if (!a) return ""
  if (a.years >= 1) {
    const s = a.months ? `${a.years} 歲 ${a.months} 個月` : `${a.years} 歲`
    return estimated ? `約 ${s}` : s
  }
  if (estimated) return a.months >= 1 ? `約 ${a.months} 個月` : "未滿 1 個月"
  if (a.months < 1) return `${a.days} 天`
  return a.days ? `${a.months} 個月 ${a.days} 天` : `${a.months} 個月`
}

/**
 * 讀取「生日是估計的」旗標（給資料層用，例如 app 的 decodeConfig）。
 * 有存 TRUE/FALSE 就照存的；**沒存（舊資料、欄位還不存在）**時：生日仍是種子預設值 → 估計，
 * 其他值 → 使用者自己在設定頁存過 → 確切。這樣已經存過確切生日的人更新後不用再做任何事。
 */
export function resolveBirthdayEstimated(stored: unknown, birthdayKey: string, seedBirthday: string): boolean {
  if (stored === true || stored === "TRUE" || stored === "true") return true
  if (stored === false || stored === "FALSE" || stored === "false") return false
  return (birthdayKey ?? "").slice(0, 10) === seedBirthday
}
