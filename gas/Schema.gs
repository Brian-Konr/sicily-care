/**
 * 西西里共同照護紀錄：Sheet 結構（依 docs/spec/logging-spec.md §2）
 * 這個檔案同時被 Code.gs、Setup.gs 和本機測試使用。
 */
var COMMON_COLS = ['id', 'ts', 'who', 'deleted'];

var SCHEMA = {
  Feed:   COMMON_COLS.concat(['food_id', 'food_name', 'qty', 'unit', 'grams_est', 'eaten_pct', 'reaction', 'note']),
  Litter: COMMON_COLS.concat(['all_normal', 'urine_count', 'urine_size', 'urine_flags', 'stool_count', 'stool_cat',
                              'purina_range', 'stool_amount', 'stool_flags', 'photo_ids', 'note']),
  Weight: COMMON_COLS.concat(['kg', 'method', 'note']),
  Med:    COMMON_COLS.concat(['kind', 'product', 'dose', 'next_due', 'note']),
  Issue:  COMMON_COLS.concat(['category', 'sub', 'severity', 'photo_ids', 'photo_urls', 'note', 'resolved']),
  Foods:  ['food_id', 'name', 'brand', 'kind', 'unit', 'default_qty', 'grams_per_unit', 'fav', 'active'],
  Config: ['key', 'value']
};

/** 紀錄類分頁（有 id/ts/who/deleted，可新增、編輯、軟刪除） */
var LOG_TABLES = ['Feed', 'Litter', 'Weight', 'Med', 'Issue'];
/** 只讀近 N 天的分頁；其他紀錄分頁（Weight、Med）量少，全部回傳 */
var WINDOWED_TABLES = ['Feed', 'Litter', 'Issue'];
/** 各分頁的主鍵欄位 */
var KEY_COL = { Feed: 'id', Litter: 'id', Weight: 'id', Med: 'id', Issue: 'id', Foods: 'food_id', Config: 'key' };

/** Config 預設值（與前端 src/data/defaults.ts 相同，測試會比對）。間隔是示意值，可在 App 設定頁改。 */
var DEFAULT_CONFIG = [
  ['users', 'Brian,Mia'],
  ['litter_clumping', 'TRUE'],           // pidan 三合一，會結塊
  ['birthday_est', '2025-11-01'],        // 生日不確定，推估 2025 年 11 月（介面標「約」）
  ['clinic_name', ''],
  ['clinic_phone', ''],
  ['clinic_24h', 'FALSE'],
  ['weight_interval_days', '14'],        // 1 歲前
  ['weight_interval_days_adult', '30'],  // 1 歲後
  ['deworm_int_days', '90'],             // 體內驅蟲
  ['ext_deworm_int_days', '30'],         // 體外驅蟲
  ['combo_deworm_int_days', '30'],       // 內外同驅
  ['fvrcp_int_days', '365'],             // 三合一疫苗
  ['rabies_int_days', '365'],            // 狂犬病疫苗
  ['intervals_are_sample', 'TRUE'],      // 間隔仍是示意值；在設定頁改過就變 FALSE
  ['dup_snack_window_min', '120']
];

/** Foods 預設清單（Foods 分頁是空的才寫入）。乾糧皇家 K36 由餵食機自動出糧，不記錄。 */
var DEFAULT_FOODS = [
  { food_id: 'hf-mackerel', name: 'Hello Fresh 鯖魚', brand: 'Hello Fresh', kind: '副食罐', unit: '罐', default_qty: 1, grams_per_unit: '', fav: true, active: true },
  { food_id: 'hf-tuna-chicken', name: 'Hello Fresh 鮪魚雞肉', brand: 'Hello Fresh', kind: '副食罐', unit: '罐', default_qty: 1, grams_per_unit: '', fav: false, active: true },
  { food_id: 'chicken-shreds', name: '雞肉絲', brand: '', kind: '零食', unit: '小撮', default_qty: 1, grams_per_unit: '', fav: false, active: true }
];

/** 第一筆體重（Weight 分頁是空的才寫入）：2026-09 的既有紀錄約 3.5 kg，日期為推估 */
var INITIAL_WEIGHT = {
  id: 'init-weight-2026-09', ts: '2026-09-01T12:00:00+08:00', who: '初始資料', deleted: false,
  kg: 3.5, method: '寵物秤', note: '初始資料：約 3.5 kg（2026-09 的既有紀錄），日期為推估'
};
