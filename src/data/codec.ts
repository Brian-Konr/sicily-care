// Sheet 原始列 ⇄ 畫面型別（src/types.ts）。只在這裡處理 Sheet 的怪癖，畫面與規則都拿乾淨的型別。
import type { AnyEntry, Config, FeedEntry, Food, IssueEntry, LitterEntry, MedEntry, MedKind, SyncState, WeightEntry } from '@/types'
import type { Cell, LogTable, RawConfig, RawFood, RawRow, Snapshot } from '@/api/sheet'
import { ageInMonths, resolveBirthdayEstimated } from '@/lib/age'
import { DEFAULT_CONFIG, MED_INTERVAL_KEYS } from './defaults'

export const TYPE_OF_TABLE = { Feed: 'feed', Litter: 'litter', Weight: 'weight', Med: 'med', Issue: 'issue' } as const
export const TABLE_OF_TYPE = { feed: 'Feed', litter: 'Litter', weight: 'Weight', med: 'Med', issue: 'Issue' } as const satisfies Record<AnyEntry['type'], LogTable>

const bool = (v: unknown) => v === true || v === 'TRUE' || v === 'true'
const str = (v: unknown) => (v === undefined || v === null ? '' : String(v))
const orNull = <T = string>(v: unknown): T | null => (v === '' || v === undefined || v === null ? null : (v as T))
const num = (v: unknown, d = 0) => (v === '' || v === undefined || v === null || isNaN(Number(v)) ? d : Number(v))
const numOrNull = (v: unknown) => (v === '' || v === undefined || v === null || isNaN(Number(v)) ? null : Number(v))
const list = <T = string>(v: unknown): T[] => (Array.isArray(v) ? v : str(v).split(',').map((s) => s.trim()).filter(Boolean)) as T[]
/** Sheet 可能把 2026-10-26 轉成日期，讀回來變 2026-10-26T00:00:00+08:00 */
const dateOnly = (v: unknown) => (orNull(v) === null ? null : str(v).slice(0, 10))

function base(r: RawRow, failedIds: Set<string>) {
  const sync: SyncState = failedIds.has(r.id) ? 'failed' : r.__pending ? 'queued' : 'synced'
  return { id: str(r.id), ts: str(r.ts), who: str(r.who), deleted: bool(r.deleted), sync }
}

export const decode = {
  Feed: (r: RawRow, f: Set<string>): FeedEntry => ({
    ...base(r, f), food_id: str(r.food_id), food_name: str(r.food_name), qty: num(r.qty, 1), unit: str(r.unit),
    grams_est: numOrNull(r.grams_est), eaten_pct: numOrNull(r.eaten_pct) as FeedEntry['eaten_pct'],
    reaction: orNull(r.reaction), note: str(r.note),
  }),
  Litter: (r: RawRow, f: Set<string>): LitterEntry => ({
    ...base(r, f), all_normal: bool(r.all_normal), urine_count: num(r.urine_count), urine_size: orNull(r.urine_size),
    urine_flags: list(r.urine_flags), stool_count: num(r.stool_count), stool_cat: orNull(r.stool_cat),
    purina_range: orNull(r.purina_range === undefined ? '' : str(r.purina_range)), stool_amount: orNull(r.stool_amount),
    stool_flags: list(r.stool_flags), photo_ids: list(r.photo_ids), note: str(r.note),
  }),
  Weight: (r: RawRow, f: Set<string>): WeightEntry => ({
    ...base(r, f), kg: num(r.kg), method: (str(r.method) || '寵物秤') as WeightEntry['method'], note: str(r.note),
  }),
  Med: (r: RawRow, f: Set<string>): MedEntry => ({
    ...base(r, f), kind: str(r.kind) as MedKind, product: str(r.product), dose: str(r.dose), next_due: dateOnly(r.next_due), note: str(r.note),
  }),
  Issue: (r: RawRow, f: Set<string>): IssueEntry => ({
    ...base(r, f), category: str(r.category) as IssueEntry['category'], sub: orNull(r.sub), severity: str(r.severity) as IssueEntry['severity'],
    photo_ids: list(r.photo_ids), photo_urls: list(r.photo_urls), note: str(r.note), resolved: bool(r.resolved),
  }),
}

export function decodeFood(r: RawFood): Food {
  return {
    food_id: str(r.food_id), name: str(r.name), brand: str(r.brand), kind: str(r.kind) as Food['kind'], unit: str(r.unit),
    default_qty: num(r.default_qty, 1), grams_per_unit: numOrNull(r.grams_per_unit), fav: bool(r.fav), active: r.active === '' ? true : bool(r.active),
  }
}

export function decodeConfig(raw: RawConfig, now: Date): Config {
  const c = { ...DEFAULT_CONFIG, ...raw }
  const birthday = dateOnly(c.birthday_est) ?? ''
  const adult = /^\d{4}-\d{2}-\d{2}$/.test(birthday) && ageInMonths(birthday, now) >= 12
  const med_interval_days: Config['med_interval_days'] = {}
  for (const [kind, key] of Object.entries(MED_INTERVAL_KEYS) as [MedKind, string][]) {
    const n = num(c[key], 0)
    if (n > 0) med_interval_days[kind] = n
  }
  return {
    birthday_est: birthday,
    // 舊 Sheet 沒有 birthday_estimated：生日還是種子值 → 估計；使用者存過的其他日期 → 確切
    birthday_estimated: resolveBirthdayEstimated(raw.birthday_estimated, birthday, String(DEFAULT_CONFIG.birthday_est)),
    clinic_name: str(c.clinic_name), clinic_phone: str(c.clinic_phone), clinic_24h: bool(c.clinic_24h),
    weight_interval_days: num(adult ? c.weight_interval_days_adult : c.weight_interval_days, adult ? 30 : 14),
    deworm_int_days: num(c.deworm_int_days, 90),
    med_interval_days,
    litter_clumping: c.litter_clumping === '' ? true : bool(c.litter_clumping),
  }
}

/** 畫面用的 Config 部分欄位 → 要寫進 Config 分頁的 key/value（只回傳有變的） */
export function configChanges(next: Partial<Config>, raw: RawConfig): [string, Cell][] {
  const cur = { ...DEFAULT_CONFIG, ...raw }
  const out: [string, Cell][] = []
  const put = (k: string, v: Cell) => { if (String(cur[k] ?? '') !== String(v)) out.push([k, v]) }
  for (const k of ['birthday_est', 'clinic_name', 'clinic_phone'] as const) if (next[k] !== undefined) put(k, next[k]!)
  if (next.birthday_estimated !== undefined) {
    const curBd = dateOnly(cur.birthday_est) ?? ''
    const curEst = resolveBirthdayEstimated(raw.birthday_estimated, curBd, String(DEFAULT_CONFIG.birthday_est))
    const bdChanged = next.birthday_est !== undefined && next.birthday_est !== curBd
    // 改了生日就一定寫旗標（不然之後剛好選到種子日期會被推定成估計）；沒改生日則只在旗標變了才寫
    if (bdChanged || next.birthday_estimated !== curEst) out.push(['birthday_estimated', next.birthday_estimated])
  }
  if (next.clinic_24h !== undefined) put('clinic_24h', next.clinic_24h)
  if (next.med_interval_days) {
    for (const [kind, n] of Object.entries(next.med_interval_days) as [MedKind, number][]) {
      const key = MED_INTERVAL_KEYS[kind]
      if (key && n) put(key, n)
    }
    if (out.some(([k]) => Object.values(MED_INTERVAL_KEYS).includes(k))) put('intervals_are_sample', false)
  }
  return out
}

/** 畫面欄位 → Sheet 欄位：陣列變逗號字串、null 變空白；sync 等前端欄位拿掉 */
export function encodeFields(fields: object): Record<string, Cell> {
  const out: Record<string, Cell> = {}
  for (const [k, v] of Object.entries(fields)) {
    if (k === 'sync' || k === 'type' || v === undefined) continue
    out[k] = Array.isArray(v) ? v.join(',') : v === null ? '' : (v as Cell)
  }
  return out
}

export interface AppData {
  feeds: FeedEntry[]
  litter: LitterEntry[]
  weights: WeightEntry[]
  meds: MedEntry[]
  issues: IssueEntry[]
  foods: Food[]
  config: Config
  rawConfig: RawConfig
  users: [string, string]
  intervalsAreSample: boolean
  /** 全部紀錄（含已撤銷），給時間軸用 */
  all: AnyEntry[]
}

export function decodeSnapshot(s: Snapshot, now: Date, failedIds: Set<string> = new Set()): AppData {
  const t = s.tables
  const feeds = t.Feed.map((r) => decode.Feed(r, failedIds))
  const litter = t.Litter.map((r) => decode.Litter(r, failedIds))
  const weights = t.Weight.map((r) => decode.Weight(r, failedIds))
  const meds = t.Med.map((r) => decode.Med(r, failedIds))
  const issues = t.Issue.map((r) => decode.Issue(r, failedIds))
  const u = str(s.config.users ?? DEFAULT_CONFIG.users).split(',').map((x) => x.trim()).filter(Boolean)
  return {
    feeds, litter, weights, meds, issues,
    foods: t.Foods.map(decodeFood).filter((f) => f.food_id),
    config: decodeConfig(s.config, now),
    rawConfig: s.config,
    users: [u[0] ?? 'Brian', u[1] ?? 'Mia'],
    intervalsAreSample: bool(s.config.intervals_are_sample ?? DEFAULT_CONFIG.intervals_are_sample),
    all: [
      ...feeds.map((e) => ({ type: 'feed' as const, ...e })), ...litter.map((e) => ({ type: 'litter' as const, ...e })),
      ...weights.map((e) => ({ type: 'weight' as const, ...e })), ...meds.map((e) => ({ type: 'med' as const, ...e })),
      ...issues.map((e) => ({ type: 'issue' as const, ...e })),
    ],
  }
}
