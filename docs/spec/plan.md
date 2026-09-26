# 西西里共同照護紀錄 PWA：v1 計畫

v1 由 AI agent 小組完成（Lead：Karina、設計：Winter、開發：Ningning、客戶窗口：Kazuha，代表 Brian）。本檔保留 v1 當時的規劃與驗收標準；決策與理由見 `decisions.md`，現況以程式碼與 `AGENTS.md` 為準。
更新：2026-09-26（台北時間）
依據：`pet-app-research.md`（範圍、儲存）、`logging-spec.md`（按鈕選項、Sheet 欄位、Apps Script／Drive 注意事項，以此為準）

## 技術選型（Brian 指定，2026-09-26）
- 前端：Vite＋React＋TypeScript＋Tailwind＋shadcn/ui，PWA 用 `vite-plugin-pwa`，build 成靜態檔（放 GitHub Pages）。不做純 HTML/CSS。
- 主題：`docs/design/design-tokens.css`（`scripts/sync-tokens.mjs` 同步進 `src/`） 使用 shadcn 變數名稱（`--background`、`--primary`、`--radius`…），所有專案共用。
- mockup 與正式 App 用同一套技術：Winter 的畫面寫成只吃 props 的展示元件（不直接呼叫資料層），Ningning 直接搬進 `src/components/` 接上資料層。
- 後端：Google Apps Script＋Sheet＋Drive（不變）。

## 範圍原則
- v1 = 五顆按鈕（副食/零食、清砂、體重、驅蟲疫苗用藥、異常回報＋照片）＋首頁狀態＋7 天時間軸。
- 不做：推播、食品資料庫、看診摘要頁、照片 AI、記帳庫存、多寵物（皆 v2 以後）。
- 乾飼料任食，不記錄。
- 貓砂先照凝結砂設計；`Config.litter_clumping`（TRUE/FALSE）關掉時，清砂表單隱藏尿塊數與尿塊大小、只留便便與尿的異常勾選，Chaewon 的尿塊規則停用。
- 一鍵優先：每顆按鈕的常見情況都要「一次點擊完成」，展開才是選填。

## 里程碑與任務

### M1　可點 mockup（第一個交付給 Brian 看）— Winter
- W1 `docs/design/DESIGN.md`：色彩、字體、間距、圓角、按鈕／晶片／卡片／表單元件、狀態色（正常／注意／緊急）、語氣與用詞、可近用性底線。
- W2 `docs/design/mockup/`：Vite＋React＋shadcn 的可點原型，手機尺寸（390×844），繁中，範例資料標明「示意」。畫面：
  1. 首頁：5 顆大按鈕、上次餵食／清砂「誰・幾點」、待填剩食卡片、體重與下次驅蟲摘要
  2. 副食/零食：近期／收藏晶片一鍵記錄 → 補填吃了多少 → 展開選填 → 2 小時重複提醒
  3. 清砂：「一切正常 ✓」預填列 → 「有異常」展開（含紅色「請盡快聯絡獸醫」）→ 非凝結砂模式
  4. 體重：輸入、比上次差值、逾期紅點、歷史列表＋簡單圖
  5. 驅蟲/疫苗/用藥：「已給 [上次產品]」一鍵 → 展開 → 下次日期
  6. 異常回報：類別、嚴重度、最多 3 張照片、已解決
  7. 7 天時間軸：撤銷（軟刪除）、編輯
  8. 首次開啟：選身分（Brian／Mia）＋輸入共享密鑰
- 驗收：每個流程都點得通；一鍵路徑一次點擊完成；字級 ≥16px、點擊區 ≥44px；沒有真實資料被誤當示意以外的東西。

### M2　前端骨架＋後端草稿（可與 M1 並行，用假資料）— Ningning
- N1 repo 根目錄：Vite＋React＋TS＋Tailwind＋shadcn/ui 的 PWA 骨架（`vite-plugin-pwa`、可加到主畫面），引用共用 `design-tokens.css`，資料層抽象成 `api`，先接本機假資料（mock adapter）。
- N2 Apps Script 草稿 `gas/`：`doGet`（讀近 N 天）、`doPost`（append 一列，`LockService` 包住）、共享密鑰驗證、`deleted` 軟刪除、`Config` 讀取、照片 base64 存 Drive 回傳 fileId。照 `logging-spec.md` §2、§3 的欄位與注意事項。
- N3 建 Sheet 用的初始化腳本（建立分頁與表頭）。
- 驗收：本機跑得起來；前端原始碼內沒有任何密鑰（密鑰由使用者首次開啟時輸入、存 localStorage）；fetch 用 `Content-Type: text/plain`；有 README 說明本機怎麼跑。

### M3　照設計實作全部流程 — Ningning（M1 通過後）
- 依 Winter 的 mockup 與 DESIGN.md 完成 8 個畫面，接 mock adapter。
- 規則實作：2 小時同類零食重複提醒、清砂上次數值預填、紅色獸醫提示、體重差值與逾期、下次驅蟲日期自動算。
- 照片：canvas 壓成長邊 1600px JPEG（順便轉掉 HEIC、清 EXIF GPS）。
- 驗收：Karina 用手機尺寸逐條走過「M1 畫面清單」＋本檔「驗收清單」全部通過。

### M4　部署（需要 Brian 本人）— Ningning 準備、Kazuha 對接
- Ningning 寫好逐步部署說明；到「用 Brian 的 Google 帳號建立 Sheet／Drive 資料夾、部署 Apps Script、分享給 Mia（PARTNER_EMAIL）」這一步停下，交給 Kazuha。
- 前端託管：GitHub Pages（見 `decisions.md`）。
- 驗收：兩支手機實際各記一筆，Sheet 看得到正確的 `who` 與時間；照片出現在指定 Drive 資料夾。

## 驗收清單（v1 全部）
1. 副食一鍵記錄 ≤ 2 次點擊（開按鈕＋點晶片）。
2. 同類零食 2 小時內第二次記錄，出現「○○ ×× 分鐘前給過」。
3. 首頁顯示上次餵食與清砂的記錄人和時間。
4. 清砂「一切正常」一次點擊完成，數字預填上次值。
5. 「蹲很久/用力」＋尿塊 0 時顯示紅色獸醫提示。
6. `litter_clumping=FALSE` 時尿塊欄位隱藏。
7. 體重顯示與上次差值；超過間隔顯示紅點。
8. 驅蟲一鍵「已給」並自動算下次日期，可手改。
9. 異常回報可附 3 張照片，可標已解決。
10. 時間軸可撤銷（寫 `deleted=TRUE`，不刪列）與編輯。
11. 兩人同時送出不互相覆蓋（LockService）。
12. 離線時送出會排隊、上線後補送（最低限度：失敗要明確提示、不默默遺失）。
13. 沒有後端網址時首次開啟跳過密鑰、直接進本機試用；有網址但失敗時，分清楚「手機離線」和「連不到 Google 後端」兩種錯誤訊息（2026-09-26 Brian 試用回報後新增）。
