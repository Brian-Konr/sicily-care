# 西西里共同照護紀錄（PWA）

Brian 和 Mia 用手機一鍵記錄西西里的副食／零食、清砂、體重、驅蟲疫苗用藥與異常回報。前端是 Vite + React + TypeScript + Tailwind v4 + shadcn/ui 的 PWA，資料存在 Google Sheet（透過 Apps Script 寫入），照片存在 Google Drive。

## 本機執行

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 單元測試（規則、資料轉換、離線佇列、Apps Script、密鑰檢查）
npm run build      # 產出 dist/
```

沒有設定 `VITE_GAS_URL` 時，App 以「本機試用」模式執行：資料只存在這支手機的瀏覽器，畫面右上角會標「本機試用」，起始資料是正式的初始資料（3 種食物、第一筆體重 3.5 kg），沒有編造的紀錄。

冒煙測試與截圖：先 `npm run build && npx vite preview --port 4173`，再 `/workspace/.venv-pw/bin/python scripts/screenshots.py`，圖會存到 `screens/`（不進 repo）。

## 結構

- `src/screens/`、`src/components/`、`src/lib/`（規則與格式函式）、`src/types.ts` 來自 Winter 的原型 `../design/mockup/`，只接收 props。更新原型後執行 `./scripts/sync-mockup.sh` 同步。App 自己維護的 `components/SampleBadge.tsx`（只在本機試用時顯示）和 `lib/utils.ts` 不會被覆蓋。
- `src/App.tsx` 是唯一有狀態的容器：路由（`#home`、`#feed`…）、toast、把畫面接到資料層。
- `src/hooks/useSicily.ts` 讀資料、追蹤連線與待送筆數。
- `src/api/` 是資料層。`index.ts` 管待送佇列（先存手機，離線不遺失，上線依序補送），底下的介面卡可以抽換：`mock.ts`（本機試用）和 `gas.ts`（Apps Script）。
- `src/data/codec.ts` 負責 Sheet 原始列和畫面型別之間的轉換；`src/data/defaults.ts` 是初始資料，`gas/Schema.gs` 有同一份，測試會比對兩邊一致。
- `gas/` 是 Apps Script 後端：`Code.gs`（API）、`Schema.gs`（欄位與初始資料）、`Setup.gs`（建立分頁、照片資料夾、密鑰、分享）。

## Sheet 的值

欄位照 `logging-spec.md` 第 2 節。選項一律存繁體中文文字（例如 `喜歡`、`蹲很久/用力`、`寵物秤`），人和 Chaewon 直接讀得懂。多選欄位存成逗號分隔，空值存空白，時間存帶 `+08:00` 的 ISO 字串。撤銷是把 `deleted` 設成 TRUE，不會真的刪列。

## API

前端一律 `POST` 到 Apps Script 網址，`Content-Type: text/plain`（避免 CORS 預檢），body 是 JSON：`{ secret, action, ... }`。

| action | 參數 | 說明 |
|---|---|---|
| `read` | `days` | Feed、Litter 回近 N 天，Weight、Med、Foods、Config 全回，未解決的 Issue 一律帶回；含已撤銷的列 |
| `append` | `table`, `record` | 新增一筆；id 由前端產生，重複 id 視為成功（重送安全） |
| `update` | `table`, `id`, `patch` | 修改欄位（可改時間，不能改 id、who） |
| `softDelete` | `table`, `id` | 撤銷 |
| `setConfig` | `key`, `value` | 設定頁存檔 |
| `upsertFood` | `record` | 新增或修改食物 |
| `uploadPhoto` | `data`（base64）, `mime`, `filename` | 存進照片資料夾，回傳 `fileId`、`url` |

密鑰錯誤回 `{ ok: false, error: "unauthorized" }`。

## 部署（M4）

以下標 ⛔ 的步驟需要 Tzu-Lin 本人的 Google 或 GitHub 帳號，開發這邊不會代做。

**Apps Script 後端**
1. ⛔ 用 Tzu-Lin 的帳號新建一個 Google Sheet，開「擴充功能 → Apps Script」。
2. 把 `gas/` 裡的 `Code.gs`、`Schema.gs`、`Setup.gs` 貼進去，`appsscript.json` 的內容貼到專案設定的資訊清單。
3. ⛔ 在「專案設定 → 指令碼屬性」新增 `PARTNER_EMAIL`，值是 Mia 的 Google 帳號。
4. ⛔ 選 `setupSicilyCare` 執行，第一次會要求授權 Sheets 和 Drive。完成後在執行紀錄看共享密鑰，私下傳給兩個人。Sheet 和照片資料夾只會分享給 `PARTNER_EMAIL` 那一個帳號。
5. ⛔「部署 → 新增部署作業 → 網頁應用程式」，執行身分選「我」，存取權選「任何人」（請求仍需要密鑰）。複製結尾是 `/exec` 的網址。

**前端（GitHub Pages）**：已上線在 https://brian-konr.github.io/sicily-care/ ，來源是 `gh-pages` 分支。
1. 部署：`SICILY_CARE_GITHUB_TOKEN=… ./scripts/deploy-gh-pages.sh`。腳本會跑測試，用 `BASE=/sicily-care/` 建置，再把 `dist/` 推到 `gh-pages`。token 只從環境變數讀，不會寫進 remote 網址或任何檔案。
2. `VITE_GAS_URL`：Apps Script 部署好之後，用環境變數帶入，例如 `VITE_GAS_URL=https://script.google.com/macros/s/…/exec ./scripts/deploy-gh-pages.sh`。沒帶的話，腳本會試著讀 repo variable `VITE_GAS_URL`，但目前的 token 沒有讀 Variables 的權限。都沒有就以「本機試用」模式建置。格式不是 Apps Script 的 `/exec` 網址時，腳本會停下來，App 也會退回本機試用。網址不是秘密，因為每個請求都要帶只存在手機裡的密鑰；密鑰不會進 repo 或 build 產物，`npm test` 會檢查。
3. 想改用 GitHub Actions 自動部署的話，把 `deploy/pages-workflow.yml` 放到 `.github/workflows/`。⛔ 推 workflow 檔需要 token 有「Workflows」寫入權限，Pages 來源也要改成 GitHub Actions，這些都要 Tzu-Lin 在 GitHub 上設定。
4. 兩支手機打開網址，選身分、輸入密鑰，再「加入主畫面」。

換密鑰：在 Apps Script 執行 `rotateSharedSecret`，舊密鑰立刻失效，兩支手機都要到設定頁「切換身分」重新輸入。
