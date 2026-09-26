/** 純函式：商業規則（logging-spec.md）。沒有副作用、不讀資料層。 */
import type {
  AnyEntry, ClinicInfo, Config, EatenPct, FeedEntry, Food, LitterEntry, MedEntry, MedKind, StoolCat, UrineFlag, WeightEntry,
} from "@/types"
import { addDays, dateKey, dayDiff } from "@/lib/format"

export const EATEN_OPTIONS: { pct: EatenPct; label: string }[] = [
  { pct: 100, label: "全吃完" },
  { pct: 75, label: "吃大半" },
  { pct: 50, label: "一半" },
  { pct: 25, label: "一點點" },
  { pct: 0, label: "沒吃" },
]
export const eatenLabel = (pct: EatenPct | null) =>
  pct === null ? "待填" : EATEN_OPTIONS.find((o) => o.pct === pct)?.label ?? `${pct}%`

export const STOOL_TO_PURINA: Record<StoolCat, string | null> = {
  "硬顆粒": "1", "正常成形": "2–3", "軟、撿起會散": "4–5", "爛泥狀": "6", "水便": "7", "今天沒便": null,
}

const live = <T extends { deleted: boolean }>(xs: T[]) => xs.filter((x) => !x.deleted)
const byTsDesc = <T extends { ts: string }>(a: T, b: T) => Date.parse(b.ts) - Date.parse(a.ts)

export function latest<T extends { ts: string; deleted: boolean }>(xs: T[]): T | undefined {
  return [...live(xs)].sort(byTsDesc)[0]
}

/** 2 小時內同一類（Food.kind）已被記錄 → 回傳那一筆，用於「Mia 30 分鐘前給過零食」 */
export const DUPLICATE_WINDOW_MIN = 120
export function findDuplicateFeed(food: Food, feeds: FeedEntry[], foods: Food[], now: Date): FeedEntry | undefined {
  const kindOf = (id: string) => foods.find((f) => f.food_id === id)?.kind
  return [...live(feeds)].sort(byTsDesc).find((e) => {
    const min = (now.getTime() - Date.parse(e.ts)) / 60_000
    return min >= 0 && min <= DUPLICATE_WINDOW_MIN && kindOf(e.food_id) === food.kind
  })
}

/** 待填剩食（24 小時內、未撤銷、eaten_pct 空白），新的在前 */
export function pendingFeeds(feeds: FeedEntry[], now: Date): FeedEntry[] {
  return live(feeds)
    .filter((e) => e.eaten_pct === null && now.getTime() - Date.parse(e.ts) < 24 * 3_600_000)
    .sort(byTsDesc)
}

/** 清砂預填：帶入上一筆的數字，沒有紀錄時用 2／1 */
export function litterDefaults(litter: LitterEntry[]) {
  const last = latest(litter)
  return { urine_count: last?.urine_count ?? 2, stool_count: last?.stool_count ?? 1 }
}

/** 紅色提示：勾「蹲很久/用力」而且尿塊為 0 */
export function needsVetNow(urine_count: number, urine_flags: UrineFlag[]): boolean {
  return urine_count === 0 && urine_flags.includes("蹲很久/用力")
}

export interface WeightSummary {
  last: WeightEntry
  prev?: WeightEntry
  diff: number | null
  daysAgo: number
  /** 距離建議量體重還有幾天；負數＝已逾期幾天 */
  dueInDays: number
  overdue: boolean
}
export function weightSummary(weights: WeightEntry[], cfg: Config, now: Date): WeightSummary | undefined {
  const xs = [...live(weights)].sort(byTsDesc)
  if (!xs.length) return undefined
  const [last, prev] = xs
  const daysAgo = dayDiff(last.ts, now)
  const dueInDays = cfg.weight_interval_days - daysAgo
  return { last, prev, diff: prev ? +(last.kg - prev.kg).toFixed(2) : null, daysAgo, dueInDays, overdue: dueInDays < 0 }
}

/** 下次日期＝給藥日＋該類型間隔；用藥或沒有設定間隔時回傳 null */
export function autoNextDue(kind: MedKind, givenDateKey: string, cfg: Config): string | null {
  const n = cfg.med_interval_days[kind]
  return n ? addDays(givenDateKey, n) : null
}

/** 每種類型最新一筆的下次日期（未來與逾期），依日期排序 */
export function upcomingMeds(meds: MedEntry[], now: Date) {
  const lastByKind = new Map<MedKind, MedEntry>()
  for (const m of [...live(meds)].sort(byTsDesc)) if (!lastByKind.has(m.kind)) lastByKind.set(m.kind, m)
  return [...lastByKind.values()]
    .filter((m) => m.next_due)
    .map((m) => ({ entry: m, next_due: m.next_due!, daysLeft: dayDiff(dateKey(now), m.next_due!) }))
    .sort((a, b) => a.next_due.localeCompare(b.next_due))
}

/** 時間軸：7 天內所有紀錄（含已撤銷，畫面以刪除線呈現），新的在前 */
export function timelineItems(all: AnyEntry[], now: Date, days = 7): AnyEntry[] {
  return all.filter((e) => dayDiff(e.ts, now) < days && Date.parse(e.ts) <= now.getTime() + 60_000).sort(byTsDesc)
}

/** 從設定得到診所資訊；沒有電話就回傳 undefined（畫面不顯示撥號鈕） */
export function clinicFromConfig(c: Pick<Config, "clinic_name" | "clinic_phone" | "clinic_24h">): ClinicInfo | undefined {
  const phone = c.clinic_phone.trim()
  return phone ? { name: c.clinic_name.trim() || "動物醫院", phone, is24h: c.clinic_24h } : undefined
}
