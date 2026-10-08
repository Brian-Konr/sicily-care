# AGENTS.md

給接手這個 repo 的 coding agent。人看的說明在 [`README.md`](README.md)；決策與理由在 [`docs/spec/decisions.md`](docs/spec/decisions.md)。改動前請讀完這份文件。

## 專案目的與使用者

- 西西里是一隻小步舞曲母貓。**Brian**（repo 擁有者，也是 Apps Script、Sheet、Drive 所在的 Google 帳號）和 **Mia** 兩個人共用這個 PWA 記錄照護。
- 核心是**一鍵操作**：常見情況點一次就記完，不必打字。五顆主按鈕是副食/零食、清砂、體重、驅蟲/疫苗/用藥、異常回報（可附照片），另外有首頁狀態、紀錄頁（可往回翻）和設定頁。
- 介面全部是**繁體中文**，時區固定 Asia/Taipei（`+08:00`）。
- 資料存在 Google Sheet，人和其他工具會直接打開 Sheet 看，所以欄位值要人看得懂（存中文選項文字，不存代碼）。
- 文件裡 Mia 的信箱一律寫成 `PARTNER_EMAIL`，不要寫出真實信箱。

## 目錄地圖

| 路徑 | 內容 |
|---|---|
| `src/App.tsx` | 唯一有狀態的容器：hash 路由（`#home`、`#feed`、`#foods`、`#issue/:id`…）、toast、把畫面接到資料層 |
| `src/screens/`、`src/components/` | 只吃 props 的展示元件，不直接呼叫資料層；`components/ui/` 是 shadcn/ui |
| `src/hooks/useSicily.ts` | 讀資料、定時重讀、追蹤連線狀態與待送筆數、`failStreak` |
| `src/api/index.ts` | 待送佇列：先存 localStorage，依序送出，成功才移除 |
| `src/api/gas.ts` | Apps Script 介面卡（`GAS_TIMEOUT_MS`、`text/plain` POST） |
| `src/api/mock.ts` | 本機試用介面卡（沒有 `VITE_GAS_URL` 時使用） |
| `src/api/errors.ts` | `NetworkError`（`kind`：`timeout`、`fetch`、`http-xxx`）與其他錯誤 |
| `src/data/codec.ts` | Sheet 原始列和畫面型別（`src/types.ts`）之間的轉換 |
| `src/data/defaults.ts` | 初始 Config、Foods、第一筆體重（必須和 `gas/Schema.gs` 一致） |
| `src/data/network.ts` | 連線狀態與橫幅規則 |
| `src/data/photo.ts` | 照片壓縮（長邊 1600px JPEG、去 EXIF）與上傳佇列 |
| `src/lib/` | 規則（重複餵食、逾期、急診警示）、年齡與日期格式 |
| `gas/` | Apps Script 後端：`Code.gs`（API）、`Schema.gs`（欄位、預設值）、`Setup.gs`（初始化、分享、密鑰）、`appsscript.json`、合併檔 `SicilyCare-AppsScript.gs` |
| `test/` | Vitest；`gas-fakes.ts` 模擬 SpreadsheetApp、DriveApp、PropertiesService 等，讓 `gas/*.gs` 能在 Node 裡測 |
| `scripts/` | `deploy-gh-pages.sh`、`build-gas.mjs`、`sync-tokens.mjs`、`screenshots.py` |
| `deploy/gas-url` | 目前的 `/exec` 網址（公開，不是秘密） |
| `docs/spec/` | `plan.md`、`logging-spec.md`（欄位與選項）、`pet-app-research.md`、`decisions.md` |
| `docs/design/` | `DESIGN.md`、`design-tokens.css`、原型 `mockup/`、截圖、交接 diff |

## 設計與產品原則

- 設計系統以 [`docs/design/DESIGN.md`](docs/design/DESIGN.md) 為準：行動優先、一鍵操作、繁中、簡潔溫暖。顏色、字體、間距只用 design token，不要寫死數值。
- 改 token 請改 `docs/design/design-tokens.css`（它的產生方式見檔頭），`npm run dev/build` 會自動同步到 `src/styles/design-tokens.css`；兩份都要 commit。
- `docs/design/mockup/` 的原型只是參考，**`src/` 的 App 程式碼才是正本**。不要把原型整份覆寫回 `src/`。
- 範例或示意資料必須標明是示意；本機試用模式不可以產生假的紀錄。
- 範圍先守住 v1，新功能先看 v2 待辦是否已經列過。

## 資料模型與 API 合約

- Sheet 分頁與欄位定義在 `gas/Schema.gs` 的 `SCHEMA`，說明在 README 的「Sheet 分頁與欄位」和 `docs/spec/logging-spec.md` 第 2 節。
- 紀錄類分頁（Feed、Litter、Weight、Med、Issue、Care）共同欄位是 `id`、`ts`、`who`、`deleted`。Foods 的主鍵是 `food_id`，Config 的主鍵是 `key`。
- 前端一律 `POST`、`Content-Type: text/plain`，body 是 `{ secret, action, ... }`。action 有 `read`、`append`、`update`、`softDelete`、`setConfig`、`upsertFood`、`uploadPhoto`、`history`、`getPhoto`，參數與回傳見 README 的 API 表和 `gas/Code.gs` 檔頭。`history` 與 `getPhoto` 不進待送佇列。
- 回應是 `{ ok: true, ... }` 或 `{ ok: false, error, message }`。`error` 代碼：`unauthorized`、`bad_json`、`bad_action`、`bad_table`、`bad_record`、`not_found`、`busy`（拿不到鎖）、`bad_photo`、`photo_too_large`、`no_folder`、`server_error`。
- 要加欄位時：改 `SCHEMA`，同步 `src/types.ts`、`src/data/codec.ts`、`docs/spec/logging-spec.md`，加測試，跑 `npm run build:gas`。已上線的 Sheet 要請 Brian 重跑 `setupSicilyCare` 補表頭（它只補缺的欄位，不清資料）。**不要改既有欄位的名稱或順序**，Sheet 裡已經有真實資料。

## 不可破壞的規則

每條的來由都在 [`docs/spec/decisions.md`](docs/spec/decisions.md)，改之前先讀對應的條目。

1. **前端不放任何私密 token 或密鑰。** 共享密鑰只由使用者在手機上輸入。`test/security.test.ts` 會掃原始碼和 `dist/`。
2. **密鑰、token、真實信箱都不進 repo。** repo 是公開的。`/exec` 網址不算秘密，可以留在 `deploy/gas-url`。
3. **寫入必須冪等。** 每筆紀錄的 `id`（食物是 `food_id`）在前端產生，後端遇到重複 id 視為成功。逾時後重送不能變成兩筆（decisions 第 9 條）。
4. **所有請求最長等 55 秒**（`GAS_TIMEOUT_MS`，包含首次開啟的密鑰檢查）。Apps Script 冷啟動常要 20 到 30 秒，不要把逾時調短（第 8 條）。
5. **離線佇列不能默默丟資料。** 送不出去的紀錄留在手機，連不上時每 20 秒重試，上線後補送（第 10 條）。
6. **連線橫幅規則**：背景讀取失敗一次不顯示，15 秒後重讀，連續失敗 2 次才顯示；有待送紀錄時失敗一次就顯示（第 11、12 條，`src/data/network.ts`）。
7. **後端寫入用 `LockService` 包住，只 append 不覆寫；刪除是軟刪除**（`deleted=TRUE`）（第 13 條）。
8. **不可以把 `birthday_estimated` 加進預設 Config。** 重跑 setup 會補上 TRUE，把存過確切生日的使用者改回「約」。缺這個 key 時由 `codec.ts` 推斷（第 18 條）。
9. **`src/data/defaults.ts` 和 `gas/Schema.gs` 的預設值必須一致**，`test/defaults.test.ts` 會比對。
10. **`gas/SicilyCare-AppsScript.gs` 是產生出來的**，改 `gas/*.gs` 後要跑 `npm run build:gas`，`test/gas-merged.test.ts` 會檢查。
11. Sheet 和照片資料夾只分享給 `PARTNER_EMAIL` 一個帳號，不開「知道連結的人都能看」（第 6 條）。
12. `appsscript.json` 的授權範圍維持最小（`spreadsheets.currentonly`、`drive`）（第 7 條）。
13. 照片上傳前要在前端壓縮並清除 EXIF 的 GPS（第 19 條）。

## 測試、建置與驗證

```bash
npm ci
npm test            # 全部單元測試，必須全過
npm run build       # tsc -b + vite build，必須沒有錯誤
npm run build:gas   # 改過 gas/ 才需要
```

改動後的驗證：

1. `npm test` 和 `npm run build` 都通過。
2. 畫面有改的話，`npm run dev` 用手機尺寸（例如 390×844）在本機試用模式走一次相關流程；可以用 `scripts/screenshots.py` 截圖（需要 Playwright，見 README）。
3. 不要在沒有 Brian 同意的情況下，用真實的 `/exec` 網址和密鑰寫入測試資料；真實 Sheet 是正式資料。
4. 部署前端用 `./scripts/deploy-gh-pages.sh`，之後打開 https://brian-konr.github.io/sicily-care/ 確認能載入。
5. 改了 `gas/` 的話，前端部署不會更新後端；要請 Brian 照 README「更新程式碼」重新部署新版本。

## 需要 Brian 本人操作的步驟

agent 做不到、也不應該嘗試繞過：

- 在 Apps Script 編輯器貼上新程式碼、執行 `setupSicilyCare` 或 `rotateSharedSecret`、授權 Google 權限。
- 部署或更新 Apps Script 網頁應用程式（「管理部署作業 → 編輯 → 新版本」可以維持網址不變）。
- 設定指令碼屬性（`PARTNER_EMAIL` 等）、提供共享密鑰。
- GitHub repo 設定：Pages 來源、Actions 權限、Secrets/Variables。

遇到這些步驟時，把要做的事和確切步驟寫給 Brian，然後停下來。

## v2 待辦

以 [`docs/spec/decisions.md`](docs/spec/decisions.md) 的「v1 後的待辦（v2）」為準，目前包括：手機推播、食品資料庫、看診前摘要頁、照片 AI 判讀、記帳與庫存、多寵物，以及 Apps Script 冷啟動若仍太慢時的定時暖機或遷移到 Supabase。
