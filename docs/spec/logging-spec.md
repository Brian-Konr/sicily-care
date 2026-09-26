# 西西里共享紀錄 PWA：記錄選項規格 v1

2026-09-26（台北時間）｜乾飼料採任食制，不記錄；只記錄手餵的副食罐和零食。

## 1. 各按鈕規格

### 🥫 副食 / 零食
- **一鍵記錄**：點按鈕會出現「近期 / 收藏」食物晶片，點一下就記錄：品項＋預設份量（例如 1 罐、1 條）＋記錄人＋時間。
- **補填吃了多少**：首頁會出現卡片「18:05 的罐罐吃了多少？」，選一個：**全吃完 / 吃大半 / 一半 / 一點點 / 沒吃**（對應 100/75/50/25/0%）。沒填就維持「待填」。
- **展開（選填）**：
  - 反應：喜歡 / 普通 / 勉強 / 拒吃
  - 份量改成其他數字或公克
  - 備註
  - ＋新增食物：名稱、類型、單位、每單位公克數
- **重複提醒**：同一類零食 2 小時內被記錄第二次時，會提醒「Mia 30 分鐘前給過」。

### 🚽 清砂（清的時候記，不強制每天都記）
- **一鍵「一切正常 ✓」**：一列顯示預填的數字：`尿塊 [2] · 便 [1] · 正常 ✓`。數字帶入上次的值，可以點 ± 調整，按 ✓ 就記錄。
- **「有異常」展開**，只有這時候才出現預設選項：

| 項目 | 選項（白話） | 對應量表 |
|---|---|---|
| 便便形狀 | 硬顆粒／正常成形／軟、撿起會散／爛泥狀／水便／今天沒便 | Purina 1／2–3／4–5／6／7 |
| 便量 | 少／正常／多 | — |
| 便便其他 | 帶血、黏液、有蟲或異物、顏色怪（黑/白）、便在盆外 | 可複選 |
| 尿塊大小 | 小（比乒乓球小）／正常（高爾夫球～網球）／大（比網球大） | PetMD 描述 |
| 尿的其他 | 很多小塊、粉紅或帶血、尿在盆外、蹲很久/用力、一直進出砂盆 | 可複選 |

- **紅色提示**：勾選「蹲很久/用力」而且尿塊為 0 時，畫面直接顯示「請盡快聯絡獸醫」。
- **Chaewon 的提醒規則**：
  - 超過 36 小時沒有清砂紀錄 → 提醒記錄
  - 單日尿塊比 7 日平均多或少 50% 以上 → 異常提醒
  - 連續 2 次軟便 → 異常提醒
- 這些都需要砂盆用的是凝結砂；豆腐砂可以用，松木砂沒辦法算尿塊。

### ⚖️ 體重
- **欄位**：公斤（小數兩位）、量法（寵物秤 / 抱著量再扣掉人重）、備註
- **首頁顯示**：「3.42 kg · 比上次 +0.08 · 12 天前量」
- **提醒**：到 1 歲前每 14 天提醒一次，之後每 30 天。來源建議 6 個月後每 1–3 個月量一次，14 天是我們刻意保守的設定。逾期時標示紅點。
- **圖表**：畫在歷史列表上方。

### 💊 驅蟲 / 疫苗 / 用藥（跟上一版一樣）
- **一鍵**「已給 [上次產品]」
- **展開**：類型（體內／體外／內外同驅／三合一／狂犬病／用藥）、產品、劑量
- **下次日期**依設定的間隔自動算出，可以手改

### 📷 異常回報
- **類別**：嘔吐（毛球／食物／液體）、食慾差、精神差、眼鼻分泌物或打噴嚏、抓癢掉毛、受傷、其他
- **嚴重度**：觀察／要注意／緊急
- **照片**：最多 3 張
- **備註**
- **完成**：標記「已解決」

## 2. Google Sheet 欄位設計
共同欄位：`id`(UUID)、`ts`（ISO，+08:00）、`who`、`deleted`（撤銷時設 TRUE，不直接刪列）

| 分頁 | 欄位 |
|---|---|
| Feed | 共同欄位＋food_id, food_name, qty, unit, grams_est, eaten_pct（空白＝待填）, reaction, note |
| Foods | food_id, name, brand, kind（副食罐/零食/肉泥/凍乾）, unit, default_qty, grams_per_unit, fav, active |
| Litter | 共同欄位＋all_normal, urine_count, urine_size, urine_flags, stool_count, stool_cat, purina_range, stool_amount, stool_flags, photo_ids, note |
| Weight | 共同欄位＋kg, method, note |
| Med | 共同欄位＋kind, product, dose, next_due, note |
| Issue | 共同欄位＋category, sub, severity, photo_ids, photo_urls, note, resolved |
| Config | key, value（例如 weight_interval_days=14、deworm_int_days=90） |

## 3. 照片上傳到 Drive（可行，但有幾個要注意的地方）
- **流程**：PWA 端先用 canvas 把照片壓成長邊 1600px 的 JPEG（約 0.3 MB），轉成 base64 送出 → Apps Script `doPost` 收到後用 `Utilities.base64Decode` → `Utilities.newBlob` → `DriveApp.getFolderById().createFile()` 存檔 → 回傳 fileId，寫進 Sheet。
- **限制**：
  - 一個 blob 最大 50 MB（base64 會讓檔案大約多出 1/3）
  - 每次執行最多 6 分鐘
  - 同一使用者最多同時 30 個執行
  - 照片壓縮後遠遠低於這些上限
- **要注意的地方**：
  1. **CORS**：Apps Script 不處理 OPTIONS preflight。fetch 要用 `Content-Type: text/plain`，並讓它跟隨 302 轉址。
  2. **網址安全**：部署設成「以我的身分執行、任何人可存取」，代表網址本身是公開的，要自己加共享密鑰來驗證。
  3. **固定網址**：更新程式時要用「管理部署 → 編輯 → 新版本」，/exec 網址才不會變。
  4. **同時寫入**：`appendRow` 外面要包 `LockService`，避免兩人同時記錄時互相覆蓋。
  5. **分享權限**：照片資料夾和 Sheet 都分享給Mia的 Google 帳號（新檔案會繼承資料夾權限），**不要**設成「知道連結的人都能看」。
  6. **PWA 裡看照片**：私人 Drive 圖片沒辦法直接用 `<img>` 嵌入。v1 做法是上傳當下顯示本機預覽，歷史紀錄裡只放「開啟」連結。
  7. **HEIC 和定位資訊**：用 canvas 重新轉存成 JPEG，會順便把 HEIC 轉掉，也會清掉 EXIF 裡的 GPS 位置。
  8. **容量**：照片佔用 Brian 的 Drive 空間（免費版 15 GB）。Chaewon 可以從 Drive 讀取照片。

## 4. 借鏡來源
- **mowfun 貓飯**（台灣團隊，iOS，免費＋訂閱，App Store 4.9★／9 則評分，v2.1.4）：
  - 選食物分成「資料庫／近期／收藏／自訂」
  - 記錄「餵食 85g」，之後再「填寫剩食」
  - 反應分四級：喜歡／正常／勉強／拒吃
  - 主食／副食／零食的比例分析
  - 桌面小工具顯示「上次 2 小時前」
  - 不設打卡壓力，想記再記
  - 可匯出飲食 PDF 給獸醫看
  - 我們借了**先記錄、後補剩食**和**四級反應**，但不做食品資料庫和推薦功能。
- **寵物筆記Family**：點一下就完成並同步給家人、點兩下標示「今天未進行」、如廁勾選。
- **Furwise**：家人都能記錄便溺，照片分析參考 Bristol 量表（人用量表）。我們改用獸醫常用的 Purina 1–7 分。
- **Kima**：排泄紀錄＋看診摘要；**鏟屎官日記**：「尿便」紀錄類型、可自訂類型。

## 資料來源
- mowfun 官網：https://www.mowfun.com/ ｜ App Store：https://apps.apple.com/tw/app/id6754154873 ｜ 介紹鏡像站：https://mowfun.appstor.io/ ｜ Threads：https://www.threads.com/@mowfun.app
- Purina 糞便評分表：https://vmc.vet.osu.edu/sites/default/files/documents/purina-fecal-score-chart.pdf ；https://vetcenter.purina.gr/sites/default/files/vet_materials/Faecal%20Score%20Chart.pdf
- 尿塊大小／次數：https://www.petmd.com/cat/symptoms/why-is-my-cat-peeing-a-lot ；https://www.vetstreet.com/home-and-cleaning/litter-boxes/things-your-cats-litter-box-can-reveal-about-their-health ；iCatCare 2025：https://pmc.ncbi.nlm.nih.gov/articles/PMC11816079/
- 體重測量頻率：https://www.royalcanin.com/tw/cats/kitten/kitten-growth-chart
- Furwise：https://furwise.app/zh/help/ ｜ 寵物筆記Family：https://apps.apple.com/hk/app/id6745396420 ｜ 鏟屎官日記：https://apps.apple.com/mo/app/id1599108594 ｜ Kima：https://www.getkima.com/
- Apps Script 配額：https://developers.google.com/apps-script/guides/services/quotas ｜ base64 上傳與 50 MB 限制：https://gist.github.com/acurtis517/3c92daeaa07d77e4f3ad32cabfbb1391 ；https://www.appscript.dev/automations/drive/build-an-external-file-request-intake-system/ ｜ CORS 做法：https://blog.greenflux.us/so-you-want-to-send-json-to-a-google-apps-script-web-app/
