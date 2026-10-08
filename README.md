# 西西里共同照護紀錄（sicily-care）

Brian 和 Mia 兩個人一起養貓咪西西里（小步舞曲，母）。這個 PWA 讓兩人在手機上一鍵記錄副食／零食、清砂、體重、驅蟲疫苗用藥、異常回報（可附照片）和居家維護，並看到首頁狀態；紀錄頁可以往回翻更早的資料（首頁讀取仍是近 7 天）。

線上版：https://brian-konr.github.io/sicily-care/

> 給 coding agent：請先讀 [`AGENTS.md`](AGENTS.md)。

## 架構

沒有我們自己的伺服器，全部是免費服務：

- **前端**：靜態 PWA（Vite、React、TypeScript、Tailwind v4、shadcn/ui、`vite-plugin-pwa`），放在 GitHub Pages，來源是本 repo 的 `gh-pages` 分支。
- **後端**：Brian 的 Google 帳號底下，一個綁定在 Google Sheet 上的 Apps Script，部署成網頁應用程式（網址結尾是 `/exec`）。
- **資料**：存在那份 Google Sheet；照片存在 Brian 的 Google Drive 資料夾「西西里照片」。Sheet 和資料夾只分享給 Mia 一個帳號。
- **保護**：`/exec` 網址是公開的（`deploy/gas-url`），每個請求都必須帶「共享密鑰」。密鑰只存在 Apps Script 的指令碼屬性和兩支手機的瀏覽器裡，不進 repo，也不進 build 產物。

手機送出的紀錄會先存在手機的待送佇列，送成功才移除，所以離線或 Google 很慢時也不會遺失。

## 目錄

```
src/            前端（App.tsx 是唯一有狀態的容器；screens/、components/ 是只吃 props 的畫面）
src/api/        資料層：待送佇列（index.ts）、Apps Script 介面卡（gas.ts）、本機試用介面卡（mock.ts）
src/data/       Sheet 列和畫面型別的轉換（codec.ts）、初始資料（defaults.ts）、連線狀態、照片壓縮
gas/            Apps Script 後端：Code.gs（API）、Schema.gs（欄位與初始資料）、Setup.gs（初始化、分享、密鑰）
                appsscript.json（資訊清單）、SicilyCare-AppsScript.gs（上面三個合併成一檔，方便貼上）
test/           Vitest 單元測試（含用假的 Apps Script 環境跑 gas/ 的程式）
scripts/        部署、合併 .gs、同步設計 token、截圖
deploy/         gas-url（目前的 /exec 網址）、pages-workflow.yml（未啟用的 Actions 範本）
docs/spec/      規劃、紀錄規格、競品研究、決策與理由（decisions.md）
docs/design/    設計系統 DESIGN.md、design-tokens.css、原型、截圖、交接 diff
```

## 本機開發

需要 Node.js 20.19 以上（Vite 8 的要求）。

```bash
npm ci
npm run dev        # http://localhost:5173
```

沒有設定 `VITE_GAS_URL` 時，App 以「本機試用」模式執行：資料只存在這個瀏覽器，畫面會標「本機試用」，起始資料是正式的初始資料（3 種食物、第一筆體重 3.5 kg），沒有編造的紀錄。想連真的後端，就用 `VITE_GAS_URL="$(cat deploy/gas-url)" npm run dev`，第一次開啟時輸入共享密鑰（要向 Brian 拿）。注意這樣寫入的是真實資料。

設計 token 的來源是 `docs/design/design-tokens.css`；`npm run dev` 和 `npm run build` 之前會自動複製到 `src/styles/`。

## 測試與建置

```bash
npm test           # 單元測試：規則、資料轉換、待送佇列與重試、連線狀態、年齡顯示、Apps Script 後端、密鑰掃描
npm run build      # 型別檢查＋產出 dist/
npm run build:gas  # 改過 gas/*.gs 後重新產生 gas/SicilyCare-AppsScript.gs（測試會檢查兩邊一致）
```

冒煙測試與截圖（選用）：

```bash
pip install playwright && playwright install chromium
npm run build && npx vite preview --port 4173 &
python3 scripts/screenshots.py http://localhost:4173/   # 存到 screens/（不進 repo）
```

## 部署前端

```bash
./scripts/deploy-gh-pages.sh
```

腳本會跑測試，讀 `deploy/gas-url` 當作 `VITE_GAS_URL`，用 `BASE=/sicily-care/` 建置，檢查產物裡沒有密鑰，再把 `dist/` 強制推到 `gh-pages` 分支。推送用這台電腦原本的 git 認證；也可以設環境變數 `SICILY_CARE_GITHUB_TOKEN`（需要這個 repo 的 Contents 寫入權限），token 只經由 credential helper 使用，不會寫進 remote 網址或檔案。

推完約一分鐘後 GitHub Pages 會更新。手機上的 PWA 下次開啟時會自動換成新版。

想改用 GitHub Actions 自動部署，把 `deploy/pages-workflow.yml` 放到 `.github/workflows/`，並在 repo 設定把 Pages 來源改成 GitHub Actions。

## Apps Script 後端

以下標 ⛔ 的步驟需要 Brian 本人的 Google 帳號，agent 不能代做。

### 第一次建立

1. ⛔ 用 Brian 的帳號新建一個 Google Sheet，開「擴充功能 → Apps Script」。
2. 把 `gas/SicilyCare-AppsScript.gs` 的內容全部貼進 `程式碼.gs`（或分別貼 `Code.gs`、`Schema.gs`、`Setup.gs` 三個檔）。在「專案設定」勾選「在編輯器中顯示 appsscript.json」，把 `gas/appsscript.json` 貼進去。
3. ⛔ 在「專案設定 → 指令碼屬性」新增 `PARTNER_EMAIL`，值是 Mia 的 Google 帳號。
4. ⛔ 選 `setupSicilyCare` 執行，第一次會要求授權 Sheets 和 Drive。完成後在執行紀錄看共享密鑰，私下傳給兩個人。
5. ⛔「部署 → 新增部署作業 → 網頁應用程式」，執行身分選「我」，存取權選「任何人」。把結尾是 `/exec` 的網址寫進 `deploy/gas-url`，再部署前端。

`setupSicilyCare` 可以重複執行：只補缺少的分頁、欄位和 Config key，不會清資料，也不會覆蓋已存在的設定。

### 更新程式碼（網址不變）

1. 改 `gas/` 裡的檔案，跑 `npm run build:gas` 和 `npm test`，commit。
2. ⛔ 在 Apps Script 編輯器貼上新的 `gas/SicilyCare-AppsScript.gs`（或對應的檔案）並存檔。
3. ⛔「部署 → 管理部署作業 → 選現有的部署 → 編輯（鉛筆）→ 版本選『新版本』→ 部署」。這樣 `/exec` 網址不會變，前端不用重新部署。
4. 如果 Schema 加了欄位，再執行一次 `setupSicilyCare` 補上表頭。
5. 如果 `appsscript.json` 的授權範圍變了，執行任一函式時會再要求授權一次。

如果改用「新增部署作業」，會得到新的網址，要更新 `deploy/gas-url` 並重新部署前端。

## 共享密鑰

- 密鑰存在 Apps Script「指令碼屬性」的 `SHARED_SECRET`，由 `setupSicilyCare` 第一次執行時產生。
- 每個人第一次開 App 時選身分（Brian 或 Mia）並輸入密鑰，存在該手機瀏覽器的 localStorage。
- 每個請求的 body 都帶著密鑰，後端比對不符就回 `{ ok: false, error: "unauthorized" }`。
- 換密鑰：⛔ 在 Apps Script 執行 `rotateSharedSecret`，舊密鑰立刻失效，兩支手機都要到設定頁「切換身分」重新輸入。
- 其他指令碼屬性：`PARTNER_EMAIL`（分享對象）、`PHOTO_FOLDER_ID`（照片資料夾，setup 自動寫入）。

## Sheet 分頁與欄位

詳細的欄位意義和選項見 [`docs/spec/logging-spec.md`](docs/spec/logging-spec.md) 第 2 節。

紀錄類分頁的共同欄位是 `id`（前端產生的 UUID）、`ts`（帶 `+08:00` 的 ISO 時間）、`who`（Brian 或 Mia）、`deleted`（撤銷時設 TRUE，不刪整列）。

| 分頁 | 欄位（共同欄位之後） |
|---|---|
| `Feed` 副食／零食 | `food_id`, `food_name`, `qty`, `unit`, `grams_est`, `eaten_pct`, `reaction`, `note` |
| `Litter` 清砂 | `all_normal`, `urine_count`, `urine_size`, `urine_flags`, `stool_count`, `stool_cat`, `purina_range`, `stool_amount`, `stool_flags`, `photo_ids`, `note` |
| `Weight` 體重 | `kg`, `method`, `note` |
| `Med` 驅蟲／疫苗／用藥 | `kind`, `product`, `dose`, `next_due`, `note` |
| `Issue` 異常回報 | `category`, `sub`, `severity`, `photo_ids`, `photo_urls`, `note`, `resolved` |
| `Care` 居家維護 | `kind`, `note` |

| 分頁 | 欄位 |
|---|---|
| `Foods` 食物清單 | `food_id`, `name`, `brand`, `kind`, `unit`, `default_qty`, `grams_per_unit`, `fav`, `active` |
| `Config` 設定 | `key`, `value` |

選項一律存繁體中文文字（例如 `喜歡`、`蹲很久/用力`、`寵物秤`），人直接讀得懂；多選欄位用逗號分隔，空值存空白。

`Config` 的 key：`users`、`litter_clumping`、`birthday_est`、`birthday_estimated`（使用者在設定頁存過生日才會出現）、`clinic_name`、`clinic_phone`、`clinic_24h`、`weight_interval_days`、`weight_interval_days_adult`、`deworm_int_days`、`ext_deworm_int_days`、`combo_deworm_int_days`、`fvrcp_int_days`、`rabies_int_days`、`intervals_are_sample`、`dup_snack_window_min`、`litter_wash_int_days`、`feeder_clean_int_days`、`desiccant_int_days`。預設值在 `gas/Schema.gs` 和 `src/data/defaults.ts`（兩邊必須一致，測試會比對）。

## API

前端一律 `POST` 到 `/exec` 網址，`Content-Type: text/plain`（避免 CORS 預檢），body 是 JSON：`{ secret, action, ... }`。回應是 `{ ok: true, ... }` 或 `{ ok: false, error: "代碼", message }`。不帶參數的 `GET` 是健康檢查。

| action | 參數 | 說明 |
|---|---|---|
| `read` | `days` | `version: 2`。Feed、Litter、Issue 回近 N 天（預設 7），Weight、Med、Care 全回，Foods、Config 全回，未解決的 Issue 一律帶回；含已撤銷的列 |
| `append` | `table`, `record` | 新增一筆；`id` 由前端產生，重複的 `id` 視為成功（重送安全） |
| `update` | `table`, `id`, `patch` | 修改欄位（可改時間，不能改 `id`、`who`） |
| `softDelete` | `table`, `id` | 撤銷（`deleted=TRUE`） |
| `setConfig` | `key`, `value` | 設定頁存檔 |
| `upsertFood` | `record` | 依 `food_id` 新增或修改食物 |
| `uploadPhoto` | `data`（base64）, `mime`, `filename` | 存進照片資料夾，回傳 `fileId`、`url` |
| `history` | `before`, `days`, `tables?` | 往回翻紀錄。半開視窗 `[before-days×86400000, before)`，預設 30 天、上限 90。回 `tables`、`from`、`before`、`hasMore`。不進待送佇列 |
| `getPhoto` | `fileId` | 讀照片資料夾裡的檔，回 `mime` 與 base64 `data`。資料夾外或找不到是 `forbidden`。不進待送佇列 |

## 文件

- [`docs/spec/decisions.md`](docs/spec/decisions.md)：主要決策、理由、踩過的坑、v2 待辦
- [`docs/spec/plan.md`](docs/spec/plan.md)：v1 規劃與驗收清單
- [`docs/spec/logging-spec.md`](docs/spec/logging-spec.md)：每種紀錄的欄位與選項
- [`docs/spec/pet-app-research.md`](docs/spec/pet-app-research.md)：競品研究
- [`docs/design/DESIGN.md`](docs/design/DESIGN.md)：設計系統（色彩、字體、間距、元件、語氣）
