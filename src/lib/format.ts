/** 純函式：時間與數字格式（台北時間、24 小時制、全形標點）。 */
const TZ = "Asia/Taipei"
const WEEK = ["日", "一", "二", "三", "四", "五", "六"]

function parts(d: Date) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
  }).formatToParts(d)
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? ""
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"))
  return { y: +get("year"), m: +get("month"), d: +get("day"), hh: get("hour"), mm: get("minute"), wd }
}

/** 18:05 */
export function fmtTime(iso: string | Date): string {
  const p = parts(new Date(iso))
  return `${p.hh}:${p.mm}`
}

/** 9/24（四） */
export function fmtDate(iso: string | Date): string {
  const p = parts(new Date(iso))
  return `${p.m}/${p.d}（${WEEK[p.wd]}）`
}

/** 2026/11/30 */
export function fmtFullDate(iso: string | Date): string {
  const p = parts(new Date(iso))
  return `${p.y}/${p.m}/${p.d}`
}

/** YYYY-MM-DD（台北日期），給 <input type="date"> 用 */
export function dateKey(iso: string | Date): string {
  const p = parts(new Date(iso))
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`
}

/** 兩個時間點相差幾個「台北日曆天」（b − a） */
export function dayDiff(a: string | Date, b: string | Date): number {
  const ka = Date.parse(dateKey(a) + "T00:00:00+08:00")
  const kb = Date.parse(dateKey(b) + "T00:00:00+08:00")
  return Math.round((kb - ka) / 86_400_000)
}

/** 今天／昨天／9/24（四） */
export function fmtDayLabel(iso: string | Date, now: Date): string {
  const d = dayDiff(iso, now)
  if (d === 0) return "今天"
  if (d === 1) return "昨天"
  return fmtDate(iso)
}

/** 紀錄頁日期標題：今天／昨天／9 月 24 日（四）／2025 年 12 月 31 日（三） */
export function fmtDayHeader(iso: string | Date, now: Date): string {
  const d = dayDiff(iso, now)
  if (d === 0) return "今天"
  if (d === 1) return "昨天"
  const p = parts(new Date(iso))
  const md = `${Number(p.m)} 月 ${Number(p.d)} 日（${WEEK[p.wd]}）`
  if (p.y === parts(now).y) return md
  return `${p.y} 年 ${md}`
}

/** 剛剛／30 分鐘前／3 小時前／12 天前 */
export function relTime(iso: string | Date, now: Date): string {
  const min = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return "剛剛"
  if (min < 60) return `${min} 分鐘前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小時前`
  return `${dayDiff(iso, now)} 天前`
}

/** 今天 18:05／昨天 21:10／9/24（四）19:30 */
export function fmtWhen(iso: string, now: Date): string {
  return `${fmtDayLabel(iso, now)} ${fmtTime(iso)}`
}

/** +0.08／−0.05（用全形減號以利閱讀） */
export function fmtDiff(n: number, digits = 2): string {
  if (Math.abs(n) < 0.005) return "±0"
  return (n > 0 ? "+" : "−") + Math.abs(n).toFixed(digits)
}

/** 轉成帶 +08:00 的 ISO 字串 */
export function toTaipeiISO(d: Date): string {
  const p = parts(d)
  const sec = String(new Date(d).getUTCSeconds()).padStart(2, "0")
  return `${dateKey(d)}T${p.hh}:${p.mm}:${sec}+08:00`
}

/** 在 YYYY-MM-DD 加 n 天 */
export function addDays(key: string, n: number): string {
  const t = Date.parse(key + "T12:00:00+08:00") + n * 86_400_000
  return dateKey(new Date(t))
}
