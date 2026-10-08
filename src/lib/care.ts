import type { CareEntry, CareKind, Config } from "@/types"
import { addDays, dateKey, dayDiff, fmtDate, fmtFullDate } from "@/lib/format"
import { latest } from "@/lib/rules"

export const CARE_ITEMS = [
  { kind: "litter_wash", label: "貓砂盆整盆清洗", action: "已清洗", configKey: "litter_wash_int_days" },
  { kind: "feeder_clean", label: "餵食器清潔", action: "已清潔", configKey: "feeder_clean_int_days" },
  { kind: "feeder_desiccant", label: "換乾燥劑", action: "已換", configKey: "desiccant_int_days" },
] as const satisfies readonly { kind: CareKind; label: string; action: string; configKey: keyof Config }[]

export function careStatus(entries: CareEntry[], kind: CareKind, intervalDays: number, now: Date): {
  daysLeft: number | null
  last?: CareEntry
} {
  const last = latest(entries.filter((e) => e.kind === kind))
  if (!last) return { daysLeft: null }
  const next = addDays(dateKey(last.ts), intervalDays)
  return { daysLeft: dayDiff(dateKey(now), next), last }
}

export type DueKind = "overdue" | "today" | "soon" | "later" | "never"

export function dueKind(daysLeft: number | null): DueKind {
  if (daysLeft === null) return "never"
  if (daysLeft < 0) return "overdue"
  if (daysLeft === 0) return "today"
  if (daysLeft <= 3) return "soon"
  return "later"
}

export function dueText(daysLeft: number | null): string {
  if (daysLeft === null) return "還沒記錄過"
  if (daysLeft < 0) return `已逾期 ${-daysLeft} 天`
  if (daysLeft === 0) return "今天到期"
  return `還有 ${daysLeft} 天`
}

export function careSummary(items: { daysLeft: number | null }[]): string {
  let overdue = 0, soon = 0, never = 0
  for (const it of items) {
    if (it.daysLeft === null) never += 1
    else if (it.daysLeft < 0) overdue += 1
    else if (it.daysLeft <= 3) soon += 1
  }
  if (overdue === 0 && soon === 0) {
    return never > 0 ? `都還沒到期・${never} 項還沒記錄過` : "都還沒到期"
  }
  const parts: string[] = []
  if (overdue) parts.push(`${overdue} 項已逾期`)
  if (soon) parts.push(`${soon} 項快到期`)
  if (never) parts.push(`${never} 項還沒記錄過`)
  return parts.join("・")
}

export function lastDoneLine(last: CareEntry | undefined, now: Date): string {
  if (!last) return "點右邊的按鈕記第一次"
  const d = dayDiff(last.ts, now)
  const when = d === 0 ? "今天" : d === 1 ? "昨天"
    : dateKey(last.ts).slice(0, 4) === dateKey(now).slice(0, 4) ? fmtDate(last.ts) : fmtFullDate(last.ts)
  return `上次：${when}・${last.who}`
}

export function careLabel(kind: CareKind): string {
  return CARE_ITEMS.find((x) => x.kind === kind)?.label ?? kind
}
