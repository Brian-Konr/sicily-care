// ===== Schema.gs =====
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

// ===== Setup.gs =====
/**
 * 一次性初始化：在「綁定在試算表上的 Apps Script」裡執行 setupSicilyCare()。
 * - 建立 7 個分頁與表頭（已存在就只補缺少的欄位，不會清資料）
 * - 寫入 Config 預設值（已存在的 key 不覆蓋）
 * - Foods、Weight 是空的才寫入初始資料（3 種食物、第一筆體重 3.5 kg）
 * - 建立 Drive 照片資料夾「西西里照片」並記下 ID
 * - 產生共享密鑰（已有就沿用），在執行記錄裡顯示一次
 * 要重新產生密鑰請執行 rotateSharedSecret()。
 */
function setupSicilyCare() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMA).forEach(function (name) { ensureSheet_(ss, name, SCHEMA[name]); });

  var cfgSheet = ss.getSheetByName('Config');
  var have = {};
  cfgSheet.getDataRange().getValues().slice(1).forEach(function (r) { have[r[0]] = true; });
  DEFAULT_CONFIG.forEach(function (kv) { if (!have[kv[0]]) cfgSheet.appendRow(kv); });

  // 初始資料：分頁是空的才寫入，重跑不會重複
  if (rows_('Foods').length === 0) DEFAULT_FOODS.forEach(function (f) { upsert_('Foods', f); });
  if (rows_('Weight').length === 0) append_('Weight', INITIAL_WEIGHT);

  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('PHOTO_FOLDER_ID')) {
    var folder = DriveApp.createFolder('西西里照片');
    props.setProperty('PHOTO_FOLDER_ID', folder.getId());
  }
  if (!props.getProperty('SHARED_SECRET')) props.setProperty('SHARED_SECRET', newSecret_());

  // 分享給另一位使用者：在「專案設定 → 指令碼屬性」加 PARTNER_EMAIL 再跑一次 setup。
  // 只加這一個帳號（Sheet 編輯者、照片資料夾檢視者），不開「知道連結的人都能看」。email 不寫進程式碼（repo 是公開的）。
  var partner = (props.getProperty('PARTNER_EMAIL') || '').trim();
  if (partner) {
    ss.addEditor(partner);
    DriveApp.getFolderById(props.getProperty('PHOTO_FOLDER_ID')).addViewer(partner);
    Logger.log('已分享 Sheet（編輯）與照片資料夾（檢視）給 ' + partner);
  }

  var sheet1 = ss.getSheetByName('工作表1') || ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1 && sheet1.getLastRow() === 0) ss.deleteSheet(sheet1);

  Logger.log('完成。照片資料夾 ID：' + props.getProperty('PHOTO_FOLDER_ID'));
  Logger.log('共享密鑰（請私下傳給兩位使用者，第一次開 App 時輸入）：' + props.getProperty('SHARED_SECRET'));
  return { folderId: props.getProperty('PHOTO_FOLDER_ID') };
}

function rotateSharedSecret() {
  var s = newSecret_();
  PropertiesService.getScriptProperties().setProperty('SHARED_SECRET', s);
  Logger.log('新的共享密鑰：' + s + '（舊密鑰立即失效，兩支手機都要重新輸入）');
}

function newSecret_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function ensureSheet_(ss, name, cols) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var header = header_(sh);
  if (header.length === 0) {
    sh.getRange(1, 1, 1, cols.length).setValues([cols]);
  } else {
    cols.forEach(function (c) {
      if (header.indexOf(c) < 0) { header.push(c); sh.getRange(1, header.length).setValue(c); }
    });
  }
  sh.setFrozenRows(1);
  return sh;
}

// ===== Code.gs =====
/**
 * 西西里共同照護紀錄：Apps Script Web App 後端（v1）
 *
 * 部署：以「我」的身分執行、任何人可存取；網址公開，所以每個請求都要帶共享密鑰。
 * 密鑰存在 Script Properties 的 SHARED_SECRET（由 Setup.gs 產生），程式碼裡不放。
 *
 * 前端一律用 POST + Content-Type: text/plain（避免 CORS preflight），body 是 JSON：
 *   { secret, action, ... }
 * action：
 *   read        { days? }                          讀近 N 天（預設 7），含已撤銷（deleted=TRUE）的列
 *   append      { table, record }                  新增一列；record.id 由前端產生，重送同一個 id 不會重複寫
 *   update      { table, id, patch }               依 id 修改欄位（編輯、補填 eaten_pct、標已解決）
 *   softDelete  { table, id }                      設 deleted=TRUE，不刪列
 *   uploadPhoto { filename, mime, data(base64) }   存到照片資料夾，回傳 fileId
 *   setConfig   { key, value }                     改 Config
 *   upsertFood  { record }                         新增或修改 Foods
 * 回應：{ ok: true, ... } 或 { ok: false, error: '代碼', message }
 */

var LOCK_WAIT_MS = 10000;
var MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 前端壓縮後約 0.3 MB，這裡給 10 MB 當防呆上限

function doPost(e) {
  return respond_(handle_(parseBody_(e)));
}

/** GET 只做健康檢查與（必要時）讀取。前端請用 POST read，避免密鑰出現在網址與瀏覽紀錄。 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!p.secret) return respond_({ ok: true, service: 'sicily-care', version: 1 });
  return respond_(handle_({ secret: p.secret, action: 'read', days: p.days }));
}

function parseBody_(e) {
  try {
    return JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return { __parseError: true };
  }
}

function handle_(req) {
  try {
    if (req.__parseError) return fail_('bad_json', '請求內容不是合法 JSON');
    if (!checkSecret_(req.secret)) return fail_('unauthorized', '共享密鑰不正確');
    switch (req.action) {
      case 'read':        return readAll_(req.days);
      case 'append':      return withLock_(function () { return append_(req.table, req.record); });
      case 'update':      return withLock_(function () { return update_(req.table, req.id, req.patch); });
      case 'softDelete':  return withLock_(function () { return update_(req.table, req.id, { deleted: true }); });
      case 'setConfig':   return withLock_(function () { return upsert_('Config', { key: req.key, value: req.value }); });
      case 'upsertFood':  return withLock_(function () { return upsert_('Foods', req.record); });
      case 'uploadPhoto': return uploadPhoto_(req);
      default:            return fail_('bad_action', '未知的 action：' + req.action);
    }
  } catch (err) {
    return fail_('server_error', String(err && err.message || err));
  }
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function fail_(code, message) {
  return { ok: false, error: code, message: message };
}

/* ---------- 驗證 ---------- */

function checkSecret_(given) {
  var expected = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
  if (!expected || typeof given !== 'string' || given.length !== expected.length) return false;
  var diff = 0;
  for (var i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) return fail_('busy', '另一個人正在寫入，請再試一次');
  try {
    var result = fn();
    SpreadsheetApp.flush();
    return result;
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Sheet 讀寫 ---------- */

function sheet_(table) {
  if (!SCHEMA[table]) throw new Error('未知的分頁：' + table);
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(table);
  if (!sh) throw new Error('找不到分頁 ' + table + '，請先執行 setupSicilyCare()');
  return sh;
}

/** 讀整張分頁成物件陣列，順便記下每筆的列號 */
function rows_(table) {
  var sh = sheet_(table);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var header = values[0];
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var obj = { __row: r + 1 };
    for (var c = 0; c < header.length; c++) obj[header[c]] = normalizeCell_(values[r][c]);
    out.push(obj);
  }
  return out;
}

function normalizeCell_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Taipei', "yyyy-MM-dd'T'HH:mm:ss'+08:00'");
  return v;
}

function toCell_(v) {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) return v.join(',');
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return v;
}

function strip_(obj) {
  var copy = {};
  for (var k in obj) if (k !== '__row') copy[k] = obj[k];
  return copy;
}

/** 依實際表頭決定欄位順序（使用者在 Sheet 裡調整欄位順序也不會寫錯欄） */
function header_(sh) {
  var lastCol = sh.getLastColumn();
  var h = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  while (h.length && h[h.length - 1] === '') h.pop(); // 資料列比表頭寬時，去掉尾端空白表頭
  return h;
}

function findRow_(table, keyValue) {
  var key = KEY_COL[table];
  var all = rows_(table);
  for (var i = 0; i < all.length; i++) if (String(all[i][key]) === String(keyValue)) return all[i];
  return null;
}

function append_(table, record) {
  if (LOG_TABLES.indexOf(table) < 0) return fail_('bad_table', '這個分頁不能用 append：' + table);
  if (!record || !record.id || !record.ts || !record.who) return fail_('bad_record', '缺少 id、ts 或 who');
  var existing = findRow_(table, record.id);
  if (existing) return { ok: true, duplicate: true, record: strip_(existing) }; // 離線重送：已寫過就當成功
  var sh = sheet_(table);
  var row = header_(sh).map(function (c) { return c === 'deleted' ? toCell_(!!record.deleted) : toCell_(record[c]); });
  sh.appendRow(row);
  return { ok: true, record: strip_(findRow_(table, record.id)) };
}

function update_(table, id, patch) {
  if (LOG_TABLES.indexOf(table) < 0) return fail_('bad_table', '這個分頁不能用 update：' + table);
  var existing = findRow_(table, id);
  if (!existing) return fail_('not_found', '找不到這筆紀錄：' + id);
  var sh = sheet_(table);
  var cols = header_(sh);
  Object.keys(patch || {}).forEach(function (k) {
    if (k === 'id' || k === 'who') return; // id 與記錄者不能改；時間可以改（補記時用）
    var c = cols.indexOf(k);
    if (c >= 0) sh.getRange(existing.__row, c + 1).setValue(toCell_(patch[k]));
  });
  return { ok: true, record: strip_(findRow_(table, id)) };
}

function upsert_(table, record) {
  var key = KEY_COL[table];
  if (!record || record[key] === undefined || record[key] === '') return fail_('bad_record', '缺少 ' + key);
  var sh = sheet_(table);
  var cols = header_(sh);
  var existing = findRow_(table, record[key]);
  if (existing) {
    cols.forEach(function (c, i) {
      if (c in record) sh.getRange(existing.__row, i + 1).setValue(toCell_(record[c]));
    });
  } else {
    sh.appendRow(cols.map(function (c) { return toCell_(record[c]); }));
  }
  return { ok: true, record: strip_(findRow_(table, record[key])) };
}

function readAll_(days) {
  var n = Math.min(Math.max(parseInt(days, 10) || 7, 1), 90);
  var since = Date.now() - n * 24 * 3600 * 1000;
  var out = { ok: true, days: n, serverTime: normalizeCell_(new Date()), tables: {}, config: readConfig_() };
  LOG_TABLES.forEach(function (t) {
    out.tables[t] = rows_(t).filter(function (r) {
      // 已撤銷的也帶回（deleted=TRUE），前端時間軸要顯示「已撤銷＋復原」
      var deleted = r.deleted === true || r.deleted === 'TRUE';
      if (WINDOWED_TABLES.indexOf(t) < 0) return true;
      if (t === 'Issue' && !deleted && !(r.resolved === true || r.resolved === 'TRUE')) return true; // 未解決的異常一律帶回
      return Date.parse(r.ts) >= since;
    }).map(strip_);
  });
  out.tables.Foods = rows_('Foods').map(strip_);
  return out;
}

function readConfig_() {
  var cfg = {};
  rows_('Config').forEach(function (r) {
    var v = r.value;
    if (v === 'TRUE' || v === true) v = true;
    else if (v === 'FALSE' || v === false) v = false;
    else if (typeof v === 'string' && v !== '' && !isNaN(Number(v))) v = Number(v);
    cfg[r.key] = v;
  });
  return cfg;
}

/* ---------- 照片 ---------- */

function uploadPhoto_(req) {
  if (!req.data || typeof req.data !== 'string') return fail_('bad_photo', '缺少照片資料');
  var mime = req.mime || 'image/jpeg';
  if (!/^image\/(jpeg|png|webp)$/.test(mime)) return fail_('bad_photo', '只接受 JPEG、PNG、WebP');
  var bytes = Utilities.base64Decode(req.data);
  if (bytes.length > MAX_PHOTO_BYTES) return fail_('photo_too_large', '照片超過 10 MB，請先壓縮');
  var folderId = PropertiesService.getScriptProperties().getProperty('PHOTO_FOLDER_ID');
  if (!folderId) return fail_('no_folder', '尚未設定照片資料夾，請先執行 setupSicilyCare()');
  var name = String(req.filename || ('sicily-' + Date.now() + '.jpg')).replace(/[\\/:*?"<>|]/g, '_');
  var file = DriveApp.getFolderById(folderId).createFile(Utilities.newBlob(bytes, mime, name));
  return { ok: true, fileId: file.getId(), url: file.getUrl() };
}
