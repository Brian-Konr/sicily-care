/**
 * 一次性初始化：在「綁定在試算表上的 Apps Script」裡執行 setupSicilyCare()。
 * - 建立 8 個分頁與表頭（已存在就只補缺少的欄位，不會清資料）
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
