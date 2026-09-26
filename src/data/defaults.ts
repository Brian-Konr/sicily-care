// 初始資料（2026-09 的既有照護紀錄）。Apps Script 的 gas/Schema.gs 有同一份，
// test/defaults.test.ts 會檢查兩邊一致。
import type { MedKind } from '@/types'
import type { Cell, RawFood, RawRow } from '@/api/sheet'

export const CAT = { name: '西西里', breed: '小步舞曲' }

/** Config 分頁的 key 與畫面型別 med_interval_days 的對照 */
export const MED_INTERVAL_KEYS: Partial<Record<MedKind, string>> = {
  '體內驅蟲': 'deworm_int_days',
  '體外驅蟲': 'ext_deworm_int_days',
  '內外同驅': 'combo_deworm_int_days',
  '三合一疫苗': 'fvrcp_int_days',
  '狂犬病疫苗': 'rabies_int_days',
}

/** Config 預設值。間隔是示意值（docs/spec/plan.md），使用者可在設定頁改 */
export const DEFAULT_CONFIG: Record<string, Cell> = {
  users: 'Brian,Mia',
  litter_clumping: true, // pidan 三合一，會結塊
  birthday_est: '2025-11-01', // 生日不確定，推估 2025 年 11 月
  clinic_name: '',
  clinic_phone: '',
  clinic_24h: false,
  weight_interval_days: 14, // 1 歲前
  weight_interval_days_adult: 30, // 1 歲後
  deworm_int_days: 90,
  ext_deworm_int_days: 30,
  combo_deworm_int_days: 30,
  fvrcp_int_days: 365,
  rabies_int_days: 365,
  intervals_are_sample: true,
  dup_snack_window_min: 120,
}

/** Foods 預設清單：品牌名稱照使用者提供的寫；乾糧（皇家 K36，餵食機自動出糧）不記錄 */
export const DEFAULT_FOODS: RawFood[] = [
  { food_id: 'hf-mackerel', name: 'Hello Fresh 鯖魚', brand: 'Hello Fresh', kind: '副食罐', unit: '罐', default_qty: 1, grams_per_unit: '', fav: true, active: true },
  { food_id: 'hf-tuna-chicken', name: 'Hello Fresh 鮪魚雞肉', brand: 'Hello Fresh', kind: '副食罐', unit: '罐', default_qty: 1, grams_per_unit: '', fav: false, active: true },
  { food_id: 'chicken-shreds', name: '雞肉絲', brand: '', kind: '零食', unit: '小撮', default_qty: 1, grams_per_unit: '', fav: false, active: true },
]

/** 第一筆體重（2026-09 既有紀錄約 3.5 kg；日期是推估） */
export const INITIAL_WEIGHT: RawRow = {
  id: 'init-weight-2026-09', ts: '2026-09-01T12:00:00+08:00', who: '初始資料', deleted: false,
  kg: 3.5, method: '寵物秤', note: '初始資料：約 3.5 kg（2026-09 的既有紀錄），日期為推估',
}
