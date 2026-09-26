/**
 * 領域型別：對應 logging-spec.md §2 的 Google Sheet 欄位（欄位名稱沿用 snake_case，方便直接對應）。
 * 這個檔案只有型別，沒有任何邏輯。
 */

/** 共同欄位：id(UUID)、ts（ISO，+08:00）、who、deleted（撤銷＝TRUE，不刪列） */
export interface BaseEntry {
  id: string
  /** ISO 8601，帶 +08:00，例如 "2026-09-26T18:05:00+08:00" */
  ts: string
  /** 記錄人顯示名稱（例如 "Brian"、"Mia"） */
  who: string
  deleted: boolean
  /** 僅前端使用（不寫進 Sheet）：離線排隊／送出失敗狀態 */
  sync?: SyncState
}

export type SyncState = "synced" | "queued" | "failed"

/* ── Foods 分頁 ── */
export type FoodKind = "副食罐" | "零食" | "肉泥" | "凍乾"

export interface Food {
  food_id: string
  name: string
  brand: string
  kind: FoodKind
  /** 單位，例如「罐」「條」「顆」「片」 */
  unit: string
  default_qty: number
  grams_per_unit: number | null
  fav: boolean
  active: boolean
}

/* ── Feed 分頁 ── */
/** 吃了多少：100/75/50/25/0；null＝待填 */
export type EatenPct = 100 | 75 | 50 | 25 | 0
export type Reaction = "喜歡" | "普通" | "勉強" | "拒吃"

export interface FeedEntry extends BaseEntry {
  food_id: string
  food_name: string
  qty: number
  unit: string
  grams_est: number | null
  eaten_pct: EatenPct | null
  reaction: Reaction | null
  note: string
}

/* ── Litter 分頁 ── */
export type UrineSize = "小" | "正常" | "大"
export type UrineFlag = "很多小塊" | "粉紅或帶血" | "尿在盆外" | "蹲很久/用力" | "一直進出砂盆"
/** 便便形狀（白話）→ purina_range 見 lib/rules.ts STOOL_TO_PURINA */
export type StoolCat = "硬顆粒" | "正常成形" | "軟、撿起會散" | "爛泥狀" | "水便" | "今天沒便"
export type StoolAmount = "少" | "正常" | "多"
export type StoolFlag = "帶血" | "黏液" | "有蟲或異物" | "顏色怪（黑/白）" | "便在盆外"

export interface LitterEntry extends BaseEntry {
  all_normal: boolean
  urine_count: number
  urine_size: UrineSize | null
  urine_flags: UrineFlag[]
  stool_count: number
  stool_cat: StoolCat | null
  /** 例如 "2–3"；由 stool_cat 對應 */
  purina_range: string | null
  stool_amount: StoolAmount | null
  stool_flags: StoolFlag[]
  photo_ids: string[]
  note: string
}

/* ── Weight 分頁 ── */
export type WeighMethod = "寵物秤" | "抱著量扣人重"

export interface WeightEntry extends BaseEntry {
  /** 公斤，小數兩位 */
  kg: number
  method: WeighMethod
  note: string
}

/* ── Med 分頁 ── */
export type MedKind = "體內驅蟲" | "體外驅蟲" | "內外同驅" | "三合一疫苗" | "狂犬病疫苗" | "用藥"

export interface MedEntry extends BaseEntry {
  kind: MedKind
  product: string
  dose: string
  /** YYYY-MM-DD；用藥可為 null */
  next_due: string | null
  note: string
}

/* ── Issue 分頁 ── */
export type IssueCategory = "嘔吐" | "食慾差" | "精神差" | "眼鼻分泌物或打噴嚏" | "抓癢掉毛" | "受傷" | "其他"
export type VomitSub = "毛球" | "食物" | "液體"
/** 觀察／要注意／緊急 → 狀態色 info／warning（注意）／destructive（緊急） */
export type Severity = "觀察" | "要注意" | "緊急"

export interface IssueEntry extends BaseEntry {
  category: IssueCategory
  sub: VomitSub | null
  severity: Severity
  photo_ids: string[]
  photo_urls: string[]
  note: string
  resolved: boolean
}

/* ── Config 分頁（key/value，前端讀成型別化物件） ── */
export interface Config {
  /** 西西里的生日（估計值，YYYY-MM-DD）；介面一律標「約」 */
  birthday_est: string
  /** 獸醫診所（皆選填，空字串＝沒填）；有電話才顯示撥號鈕 */
  clinic_name: string
  clinic_phone: string
  clinic_24h: boolean
  /** 1 歲前 14，之後 30 */
  weight_interval_days: number
  deworm_int_days: number
  /** 各類型預設間隔（天）；用藥不自動排 */
  med_interval_days: Partial<Record<MedKind, number>>
  /** 保留欄位：目前用凝結砂（pidan 三合一），UI 不分支 */
  litter_clumping: boolean
}

/* ── 前端用的組合型別 ── */
export type AnyEntry =
  | ({ type: "feed" } & FeedEntry)
  | ({ type: "litter" } & LitterEntry)
  | ({ type: "weight" } & WeightEntry)
  | ({ type: "med" } & MedEntry)
  | ({ type: "issue" } & IssueEntry)

export type EntryType = AnyEntry["type"]

/** 照片草稿（上傳前的本機預覽） */
export interface PhotoDraft {
  id: string
  /** 本機預覽 URL（object URL 或 data URL）；原型用 null 表示示意佔位圖 */
  previewUrl: string | null
  label: string
}

export type ScreenId = "home" | "feed" | "litter" | "weight" | "med" | "issue" | "timeline" | "onboarding" | "settings"

/** 設定頁可編輯的欄位（Config 的子集） */
export type SettingsValues = Pick<Config, "birthday_est" | "clinic_name" | "clinic_phone" | "clinic_24h" | "med_interval_days">

/** 傳給畫面的診所資訊；沒有電話時為 undefined */
export interface ClinicInfo {
  name: string
  phone: string
  is24h: boolean
}
/**
 * 連線狀態（DESIGN.md §8）：online／offline（手機本身沒網路，navigator.onLine=false）／
 * unreachable（手機有網路，但後端 Apps Script 沒回應或回錯）。本機試用不是連線狀態，另由 App 殼處理。
 */
export type NetworkState = "online" | "offline" | "unreachable"
