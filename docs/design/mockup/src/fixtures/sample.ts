/**
 * ⚠️ 示意資料（全部是假的）⚠️
 * 只給原型展示用。名字 Brian／Mia 是指定的顯示名稱；食物、產品、數字、時間都是編的。
 * 正式 App 請勿 import 這個檔案。
 */
import type { Config, FeedEntry, Food, IssueEntry, LitterEntry, MedEntry, WeightEntry } from "@/types"

/** 示意「現在」：2026-09-26（六）18:35 台北時間 */
export const SAMPLE_NOW = "2026-09-26T18:35:00+08:00"

export const SAMPLE_USERS: [string, string] = ["Brian", "Mia"]
export const SAMPLE_ME = "Brian"
export const SAMPLE_CAT = { name: "西西里", breed: "小步舞曲" }

/** 審閱用：「確切生日」狀態的示意生日（不是西西里的真實生日） */
export const SAMPLE_EXACT_BIRTHDAY = { birthday_est: "2025-10-18", birthday_estimated: false }

export const SAMPLE_CONFIG: Config = {
  birthday_est: "2025-11-01", // 初始資料：生日約 2025-11-01（估計）
  birthday_estimated: true, // 種子資料是估計值
  clinic_name: "",
  clinic_phone: "",
  clinic_24h: false,
  weight_interval_days: 14,
  deworm_int_days: 90,
  // 示意預設（plan.md 決議：體內 90、體外 30、疫苗 365，可在設定改）
  med_interval_days: { "體內驅蟲": 90, "體外驅蟲": 30, "內外同驅": 30, "三合一疫苗": 365, "狂犬病疫苗": 365 },
  litter_clumping: true, // pidan 三合一，會結塊
}

/** 審閱開關「診所已設定」用的示意診所（電話刻意用不存在的號碼） */
export const SAMPLE_CLINIC = { clinic_name: "示意動物醫院", clinic_phone: "02-0000-0000", clinic_24h: true }

/** 初始 Foods（預設清單；乾飼料任食不記錄，所以不在這裡） */
export const SAMPLE_FOODS: Food[] = [
  { food_id: "f1", name: "Hello Fresh 鯖魚", brand: "Hello Fresh", kind: "副食罐", unit: "罐", default_qty: 1, grams_per_unit: null, fav: true, active: true },
  { food_id: "f2", name: "Hello Fresh 鮪魚雞肉", brand: "Hello Fresh", kind: "副食罐", unit: "罐", default_qty: 1, grams_per_unit: null, fav: false, active: true },
  { food_id: "f3", name: "雞肉絲", brand: "", kind: "零食", unit: "小撮", default_qty: 1, grams_per_unit: null, fav: false, active: true },
]

const base = { deleted: false, sync: "synced" as const }
const feed = (id: string, ts: string, who: string, f: Food, eaten: FeedEntry["eaten_pct"], extra: Partial<FeedEntry> = {}): FeedEntry => ({
  ...base, id, ts, who, food_id: f.food_id, food_name: f.name, qty: f.default_qty, unit: f.unit,
  grams_est: f.grams_per_unit ? f.grams_per_unit * f.default_qty : null, eaten_pct: eaten, reaction: null, note: "", ...extra,
})
const [mackerel, tunaChicken, chicken] = SAMPLE_FOODS

// 餵食紀錄：時間、記錄人、吃了多少都是示意
export const SAMPLE_FEEDS: FeedEntry[] = [
  feed("fd1", "2026-09-26T18:05:00+08:00", "Mia", mackerel, null),
  feed("fd2", "2026-09-26T15:40:00+08:00", "Brian", chicken, 100, { reaction: "喜歡" }),
  feed("fd3", "2026-09-25T20:40:00+08:00", "Brian", tunaChicken, 75, { reaction: "喜歡" }),
  feed("fd4", "2026-09-25T15:10:00+08:00", "Mia", chicken, 100),
  feed("fd5", "2026-09-24T19:30:00+08:00", "Mia", mackerel, 50, { reaction: "勉強" }),
  feed("fd6", "2026-09-23T21:00:00+08:00", "Brian", tunaChicken, 100),
  feed("fd7", "2026-09-22T19:15:00+08:00", "Mia", mackerel, 100, { reaction: "喜歡" }),
]

const litter = (id: string, ts: string, who: string, u: number, s: number, extra: Partial<LitterEntry> = {}): LitterEntry => ({
  ...base, id, ts, who, all_normal: true, urine_count: u, urine_size: null, urine_flags: [], stool_count: s,
  stool_cat: null, purina_range: null, stool_amount: null, stool_flags: [], photo_ids: [], note: "", ...extra,
})
export const SAMPLE_LITTER: LitterEntry[] = [
  litter("lt1", "2026-09-26T08:30:00+08:00", "Brian", 2, 1),
  litter("lt2", "2026-09-25T09:10:00+08:00", "Mia", 3, 1),
  litter("lt3", "2026-09-24T22:00:00+08:00", "Brian", 2, 1, { all_normal: false, stool_cat: "軟、撿起會散", purina_range: "4–5", note: "有點軟（示意）" }),
  litter("lt4", "2026-09-23T08:45:00+08:00", "Mia", 3, 1),
]

const w = (id: string, ts: string, who: string, kg: number): WeightEntry => ({ ...base, id, ts, who, kg, method: "寵物秤", note: "" })
// 第一筆 3.5 kg（2026-09，初始資料；日期「9/1」是示意，實際哪一天待確認），之後一筆為示意
export const SAMPLE_WEIGHTS: WeightEntry[] = [
  w("w1", "2026-09-14T21:00:00+08:00", "Mia", 3.58),
  w("w2", "2026-09-01T21:00:00+08:00", "Brian", 3.5),
]

export const SAMPLE_MEDS: MedEntry[] = [
  { ...base, id: "m1", ts: "2026-09-01T20:00:00+08:00", who: "Brian", kind: "體內驅蟲", product: "驅蟲藥錠 A（示意）", dose: "1 錠", next_due: "2026-11-30", note: "" },
  { ...base, id: "m2", ts: "2026-08-28T20:00:00+08:00", who: "Mia", kind: "體外驅蟲", product: "滴劑 B（示意）", dose: "1 支", next_due: "2026-09-27", note: "" },
  { ...base, id: "m3", ts: "2026-05-20T11:00:00+08:00", who: "Mia", kind: "三合一疫苗", product: "三合一疫苗（示意）", dose: "1 劑", next_due: "2027-05-20", note: "6 月齡補強（示意）" },
]

export const SAMPLE_ISSUES: IssueEntry[] = [
  { ...base, id: "i1", ts: "2026-09-24T10:15:00+08:00", who: "Mia", category: "嘔吐", sub: "毛球", severity: "觀察", photo_ids: ["p1"], photo_urls: [], note: "吐了一小團毛球，精神正常（示意）", resolved: false },
  { ...base, id: "i2", ts: "2026-09-12T09:00:00+08:00", who: "Brian", category: "眼鼻分泌物或打噴嚏", sub: null, severity: "觀察", photo_ids: [], photo_urls: [], note: "打噴嚏兩次（示意）", resolved: true },
]
