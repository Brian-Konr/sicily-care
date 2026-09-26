// 時間工具：一律以台北時間（+08:00）產生 ISO 字串，不受手機時區影響。
const TPE_OFFSET_MS = 8 * 3600 * 1000
const DAY = 86400000

export function tpeIso(ms: number = Date.now()): string {
  return new Date(ms + TPE_OFFSET_MS).toISOString().slice(0, 19) + '+08:00'
}
export function tpeDate(ms: number = Date.now()): string {
  return tpeIso(ms).slice(0, 10)
}
export function addDays(dateStr: string, days: number): string {
  const ms = Date.parse(dateStr.length === 10 ? `${dateStr}T00:00:00+08:00` : dateStr)
  return tpeDate(ms + days * DAY)
}
export function minutesBetween(aIso: string, bMs: number): number {
  return Math.round((bMs - Date.parse(aIso)) / 60000)
}
export function daysBetween(aIso: string, bMs: number): number {
  return Math.floor((bMs - Date.parse(aIso)) / DAY)
}
/** 「18:05」「昨天 18:05」「9/24 18:05」 */
export function shortTime(iso: string, nowMs: number = Date.now()): string {
  const d = iso.slice(0, 10)
  const hm = iso.slice(11, 16)
  if (d === tpeDate(nowMs)) return hm
  if (d === tpeDate(nowMs - DAY)) return `昨天 ${hm}`
  return `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))} ${hm}`
}
