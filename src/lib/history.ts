import type { EntryType } from "@/types"
import { toTaipeiISO } from "@/lib/format"

export type TimelineFilter =
  | "副食／零食" | "清砂" | "體重" | "驅蟲／疫苗／用藥" | "異常" | "居家維護"

export const FILTER_CHIPS = ["全部", "副食／零食", "清砂", "體重", "驅蟲／疫苗／用藥", "異常", "居家維護"] as const

export const FILTER_TYPE: Record<TimelineFilter, EntryType> = {
  "副食／零食": "feed",
  "清砂": "litter",
  "體重": "weight",
  "驅蟲／疫苗／用藥": "med",
  "異常": "issue",
  "居家維護": "care",
}

export function nextFilters(current: TimelineFilter[], rawNext: string[]): TimelineFilter[] {
  const next = rawNext.filter((x): x is TimelineFilter => x !== "全部")
  const turnedOnAll = rawNext.includes("全部") && current.length > 0
  if (turnedOnAll || next.length === 0) return []
  return next
}

export function matchesFilter(type: EntryType, filters: TimelineFilter[]): boolean {
  return filters.length === 0 || filters.some((f) => FILTER_TYPE[f] === type)
}

export function firstBefore(serverTime: string, days: number, now: Date): string {
  const ms = Date.parse(serverTime)
  const t = Number.isFinite(ms) ? ms : now.getTime()
  return toTaipeiISO(new Date(t - days * 86_400_000))
}

export function mergeRows<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const ids = new Set(existing.map((e) => e.id))
  const out = [...existing]
  for (const row of incoming) if (!ids.has(row.id)) { out.push(row); ids.add(row.id) }
  return out
}

export function countMatching<T extends { type: EntryType }>(entries: T[], filters: TimelineFilter[]): number {
  return entries.filter((e) => matchesFilter(e.type, filters)).length
}
