# 西西里共同照護紀錄：可點原型 v0.1（示意）

2026-09-26（台北時間）｜依據：[`../../spec/plan.md`](../../spec/plan.md) M1／W2、[`../../spec/logging-spec.md`](../../spec/logging-spec.md)、[`../DESIGN.md`](../DESIGN.md)

## 原型只是設計參考，App 程式碼才是正本

**原型只是設計參考，App 程式碼（repo 根目錄的 `src/`）才是正本。**

- 這些畫面當初寫成「只吃 props 的展示元件」，再複製進 App 接上資料層。那個複製流程已經結束。
- **之後請直接改 App**（`src/screens/`、`src/components/`、`src/lib/` …）。只有想保留設計參考（例如給人看新畫面的樣子）時才回頭改這個原型；原型可能已經落後於 App，不要拿它覆蓋 App 的檔案。
- [`../handoff/`](../handoff/) 裡的 diff 是當時從原型搬到 App 的接線紀錄，只是歷史紀錄，不需要再套用。
- 設計規則（色彩、字體、間距、元件、語氣）以 [`../DESIGN.md`](../DESIGN.md) 為準；色彩 token 的來源是 [`../design-tokens.css`](../design-tokens.css)。

> ⚠️ 原型裡所有資料都是**示意**（`src/fixtures/sample.ts`）。顯示名稱 Brian／Mia 為指定的使用者名稱；其餘數字、時間、產品、診所都是編的。
> v0.1 依 [plan.md](../../spec/plan.md) 決議紀錄更新示意資料：食物清單＝Hello Fresh 鯖魚（收藏）、Hello Fresh 鮪魚雞肉、雞肉絲（沒有乾糧）；體重第一筆 3.5 kg（2026-09，日期 9/1 為示意）＋一筆 9/14 3.58 kg（示意）；生日 2025-11-01（約）；診所預設空白。

## 怎麼開

原型是獨立的 npm 專案（跟 App 分開安裝），但要放在 repo 的 `docs/design/mockup/`：它會讀上一層的 `docs/design/design-tokens.css`。

```bash
cd docs/design/mockup            # 從 repo 根目錄
npm ci
npm run dev          # http://localhost:5173 ，桌機會看到左側審閱面板＋390×844 手機外框
npm run build        # tsc -b && vite build
npm test             # vitest：test/age.test.ts（年齡顯示）
npm run preview      # 用 build 結果開預覽（預設 http://localhost:4173，可改：npm run preview -- --port 5000）
```

重拍截圖（`screens/*.png`，選用）：

```bash
python3 -m venv .venv && . .venv/bin/activate      # 任何位置的 venv 都可以
pip install playwright && playwright install chromium
npm run build && npm run preview &                 # 或指定埠：npm run preview -- --port 5000
python scripts/screenshots.py                      # 預設連 http://localhost:4173/
python scripts/screenshots.py http://localhost:5000/   # 或 PREVIEW_URL=… / PREVIEW_PORT=5000
```

`screenshots.py` 預設用 Playwright 內建的 Chromium；要用系統 Chrome 可設 `CHROME_PATH=/path/to/chrome`。截圖一律寫到本資料夾的 `screens/`。

- **網址參數**（審閱／截圖用）：`#home` `#feed` `#litter` `#weight` `#med` `#issue` `#timeline` `#onboarding` `#settings` 直接進某畫面；`?shot` 只顯示手機（無面板、無外框）；`&full` 整頁展開；`&offline`（手機離線）、`&unreachable`（網路正常但連不到後端）、`&trial`（本機試用：頂部試用橫條＋首次開啟不問密鑰）、`&nosecret`（只關 needSecret、不顯示橫條）、`&slow`（慢連線模擬：密鑰確認要 25 秒）、`&ob=checking|bad-secret|unreachable|offline`（首次開啟直接顯示該狀態）、`&overdue`（體重逾期）、`&home=loading|empty|error`、`&clinic`（診所電話已設定＝示意動物醫院 02-0000-0000、24 小時）、`&exactbd`（確切生日＝示意 2025-10-18，首頁顯示「11 個月 8 天」）。
- **審閱面板**（桌機寬度 >500px）：9 個畫面切換、深色模式、手機離線、連不到後端（網路正常）、本機試用（沒有後端網址）、首次開啟要密鑰（needSecret）、慢連線模擬（確認密鑰要 25 秒）、下一筆送出失敗、體重逾期、**確切生日（示意 2025-10-18）**（關掉＝種子估計生日 2025-11-01）、**診所電話已設定（示意）**、首頁狀態（一般／載入中／空白／讀取失敗）、首次開啟狀態（一般／確認中／密鑰錯誤／連不到後端／手機離線）、重設示意資料。
- **在 iPhone 上看**：寬度 ≤500px 時不畫外框，直接全螢幕並使用真實的 `env(safe-area-inset-*)`；用 Safari「分享 → 加入主畫面」可體驗 standalone。
- 深色模式預設跟隨系統（`prefers-color-scheme`），面板可強制切換。
- 色彩 tokens 直接從 `docs/design/design-tokens.css` 匯入（`src/index.css` 裡的相對路徑 `../../design-tokens.css`），`vite.config.ts` 已用 `server.fs.allow` 允許 dev server 讀上一層。不需要網路（無 CDN、無外部字型）。

## 畫面與流程（全部可點）

| # | 畫面 | 主要流程 | 截圖（390×844，@2x） |
|---|---|---|---|
| 1 | 首頁 | 標題列：西西里・小步舞曲・年齡（`lib/age.ts` 由設定的生日算：估計「**約 10 個月**」／確切「**11 個月 8 天**」）＋右上「我是 Brian ⚙」→ 設定；上次餵食／清砂「誰・幾點」→ 待填「18:05 的罐罐吃了多少？」點一下完成 → 5 顆大按鈕 → 清砂一鍵列「尿塊 [2]・便 [1]・一切正常 ✓」→ 體重摘要（3.58 kg・比上次 +0.08・12 天前量）＋下次驅蟲 → 最近紀錄 | `01-home.png`、`01-home-full.png`、`01-home-dark.png`、`01-home-dark-full.png`、`01b-home-offline.png`、`01f-home-unreachable.png`、`01g-home-local-trial.png`、`01h-home-exact-age.png`（確切生日）、`01c-home-loading.png`、`01d-home-empty.png`、`01e-home-litter-toast.png` |
| 2 | 副食／零食 | 近期／收藏晶片**點一下就記錄**（首頁→按鈕→晶片＝2 次點擊）→ toast「復原」→ 補填吃了多少 → 展開選填（反應、份量、備註）→ ＋新增食物；同類 2 小時內再記 → 底部 Sheet（示意：點 Hello Fresh 鮪魚雞肉 →「Mia 30 分鐘前給過副食罐，還要記錄嗎？」；點雞肉絲則直接記錄） | `02-feed.png`、`02-feed-full.png`、`02b-feed-logged-toast.png`、`02c-feed-expanded.png`、`02d-feed-duplicate-sheet.png` |
| 3 | 清砂 | 預填上次數字，「一切正常 ✓」一次點擊完成 → 「有異常？展開填寫」：尿塊大小、尿的其他、便便形狀／便量／其他；**蹲很久/用力＋尿塊 0 → 紅色「請盡快聯絡獸醫」**；設定裡有診所電話時橫幅內多一顆「打給 {診所}」撥號鈕（`tel:`，24 小時營業另標「24 小時」），沒有電話就只有一句提示、沒有按鈕 | `03-litter.png`、`03b-litter-urgent-vet.png`（未設定診所）、`03c-litter-urgent-vet-call.png`（已設定） |
| 4 | 體重 | 輸入（`inputMode="decimal"`）→ 即時「比上次 +0.06 kg」→ 量法（寵物秤／抱著量扣人重自動相減）→ 逾期紅點＋文字 → 折線圖＋歷史列表 | `04-weight.png`、`04-weight-full.png`、`04b-weight-overdue.png` |
| 5 | 驅蟲／疫苗／用藥 | 「已給 滴劑 B（示意）」一鍵 → 下次日期自動算 → 其他排程各自「已給」→ 展開：類型、產品、劑量、給的日期、下次日期（自動＋可手改＋改回自動） | `05-med.png`、`05b-med-expanded.png` |
| 6 | 異常回報 | 類別（嘔吐→毛球／食物／液體）、嚴重度（觀察／要注意／緊急，緊急出現紅色提示）、最多 3 張照片（示意佔位圖，可移除）、備註 → 送出；未解決清單「標記已解決」＋復原；已解決可改回 | `06-issue.png`、`06b-issue-filled.png` |
| 7 | 7 天紀錄 | 篩選 → 依日分組 → 「撤銷」＝劃掉（`deleted=TRUE`）＋「已撤銷」＋「復原」→ 「編輯」底部 Sheet（時間、吃了多少／尿塊便／kg、備註） | `07-timeline.png`、`07b-timeline-undone.png`、`07c-timeline-edit-sheet.png` |
| 8 | 首次開啟 | 選身分（Brian／Mia）→ 輸入共享密鑰（可顯示／隱藏）→ 開始使用；iOS「分享 → 加入主畫面」提示。三種失敗分開：密鑰錯誤（紅字，原型輸入 `wrong`）／連不到後端（warning＋「再試一次」）／手機離線（info）。**本機試用**（沒有後端網址，`needSecret=false`）：只選身分、沒有「1／2」步驟與密鑰欄，頂部固定「本機試用・資料只存在這支手機」。確認等太久時按鈕下方灰字：5 秒「第一次連線 Google 比較慢，最多約半分鐘」→ 20 秒「還在連線，請不要關掉 App」（DESIGN.md §8「長等待要說明」） | `08-onboarding.png`、`08-onboarding-full.png`、`08b-onboarding-bad-secret.png`、`08c-onboarding-local-trial.png`、`08d-onboarding-unreachable.png`、`08e-onboarding-offline.png`、`08f-onboarding-wait-5s.png`、`08g-onboarding-wait-20s.png` |
| 9 | 設定 | 首頁右上「我是 Brian ⚙」進入 → 西西里生日（日期；即時預覽「首頁會顯示『約 10 個月』」）＋「生日是估計的」Switch（打開＝顯示「約」、不顯示天數；**改日期時自動關掉**，可再手動打開）→ 獸醫診所（選填：名稱、電話 `type=tel`、24 小時營業 Switch）→ 驅蟲／疫苗間隔（天，Stepper＋可直接輸入，標「示意預設」）→ 身分「切換成 Mia」（Dialog 確認，清除密鑰）；底部唯一「儲存」→ toast「已儲存設定」；有變更時按返回 → 底部 Sheet「還沒儲存，要離開嗎？」 | `09-settings.png`、`09-settings-full.png`、`09b-settings-unsaved-sheet.png`、`09c-settings-birthday-exact.png`（改日期後 Switch 自動關、預覽「11 個月 8 天」） |
| — | 審閱面板（桌機） | Sheet 掛在手機外框內 | `00-reviewer-shell.png` |

所有截圖在 `screens/`。`*-full.png` 為整頁展開版（高度不固定），其餘為 390×844。

## 架構

```
src/
  types.ts              領域型別，欄位名對應 logging-spec.md §2（FeedEntry、Food、LitterEntry、WeightEntry、MedEntry、IssueEntry、Config…）
  lib/format.ts         純函式：台北時間格式（18:05、9/24（四）、12 天前）、差值 +0.08
  lib/rules.ts          純函式：2 小時重複提醒、待填、清砂預填、獸醫提示、體重差值／逾期、下次日期、時間軸篩選
  lib/describe.ts       純函式：紀錄 → 列表文字／狀態徽章
  lib/age.ts            純函式：生日 → 年齡文字（日曆月；ageParts、ageInMonths、catAgeLabel(birthday, now, estimated)、resolveBirthdayEstimated）
  components/ui/        shadcn 元件（已依 DESIGN.md 調整：44px、16px、語意變體、Portal 容器）
  components/*.tsx      組合元件（純展示，只吃 props）
  screens/*.tsx         9 個畫面（純展示，只吃 props＋callbacks；只有展開／草稿等 UI 暫態）
  fixtures/sample.ts    ⚠️ 示意資料，正式 App 不要 import
  App.tsx               ⚠️ 原型殼：唯一有狀態的地方（記憶體資料、審閱面板、toast 呼叫）
```

- 當初 App 從這裡複製了 `types.ts`、`lib/`、`components/`（含 `ui/`）、`screens/`（`App.tsx`、`fixtures/` 從來不複製）。之後兩邊各自演進，**以 App 為準**（見上方「原型只是設計參考」）。
- 畫面**不呼叫資料層**、不呼叫 `toast()`。App 層在 callback 成功後自己顯示 Sonner toast（文案見下方「toast 文案」），「復原」＝把該筆 `deleted` 設 TRUE（或還原剛剛改的欄位）。
- `ScreenLayout` 的 `sample` prop 預設 true（顯示示意徽章），正式 App 傳 `false`（或改預設）。
- `components/ui/portal-context.tsx`：原型用來把 Sheet 掛進手機外框；正式 App 不用 Provider。
- 正式 App 在 `src/index.css` 依序 `@import "tailwindcss"; @import "tw-animate-css"; @import "<相對路徑>/design-tokens.css";`，並用 `matchMedia('(prefers-color-scheme: dark)')` 切換 `<html class="dark">`。

## 各畫面 props 摘要

共通：`now: Date`、`network: "online" | "offline" | "unreachable"`（`NetworkState`；unreachable＝手機有網路但後端沒回應）、`queuedCount: number`（排隊待送筆數），子畫面都有 `onBack()`。

| 畫面 | 資料 props | callbacks |
|---|---|---|
| `HomeScreen` | `cat {name, breed}`（年齡由 `config.birthday_est` 經 `catAgeLabel` 算，不要傳字串）、`me`、`status: "ready"｜"loading"｜"error"`、`failedCount`、`config`、`feeds`、`litter`、`weights`、`meds`、`recent: AnyEntry[]` | `onOpen(target)`、`onFillEaten(id, pct)`、`onLitterNormal({urine_count, stool_count})`、`onRetry()`、`onRetrySync()`（`onOpen("settings")`＝點身分膠囊；`onSwitchUser` 已移到設定頁） |
| `FeedScreen` | `me`、`foods: Food[]`、`feeds: FeedEntry[]` | `onLog(food)`（重複提醒已在畫面內確認過）、`onFillEaten(id, pct)`、`onSaveDetail(id, {reaction, qty, note})`、`onAddFood({name, kind, unit, grams_per_unit})` |
| `LitterScreen` | `litter: LitterEntry[]`、`clinic?: ClinicInfo {name, phone, is24h}`（用 `clinicFromConfig(config)`；沒電話時是 `undefined` → 不顯示撥號鈕） | `onNormal({urine_count, stool_count})`、`onSubmitDetail(LitterDetail)`（LitterEntry 去掉共同欄位） |
| `WeightScreen` | `config`、`weights: WeightEntry[]` | `onSubmit({kg, method, note})` |
| `MedScreen` | `config`、`meds: MedEntry[]` | `onGiveAgain(lastEntry)`（一鍵已給）、`onSubmit({kind, product, dose, given_date, next_due, note})` |
| `IssueScreen` | `issues: IssueEntry[]` | `pickPhoto(): Promise<PhotoDraft｜null>`（正式：開相機／相簿＋canvas 壓 1600px JPEG）、`onSubmit({category, sub, severity, photos, note})`、`onResolve(id)`、`onReopen(id)` |
| `TimelineScreen` | `failedCount`、`entries: AnyEntry[]`（含 deleted） | `onHome()`、`onUndo(entry)`、`onRestore(entry)`、`onEdit(id, EntryPatch)`、`onRetrySync()` |
| `SettingsScreen` | `catName`、`values: SettingsValues`（`birthday_est`、`birthday_estimated`、`clinic_name`、`clinic_phone`、`clinic_24h`、`med_interval_days`，皆為 Config 欄位）、`me`、`users: [string, string]`、`intervalsAreSample?`（間隔仍是預設值時顯示「示意預設」） | `onBack()`（沒變更時才會被呼叫；有變更先跳未儲存 Sheet）、`onSave(values)`（整包；App 寫回 Config 並 toast）、`onSwitchUser()`（Dialog 確認後才呼叫）、`onDirtyChange?(dirty)`（正式 App 可接 `beforeunload`） |
| `OnboardingScreen` | `catName`、`users: [string, string]`、`status: "idle"｜"checking"｜"bad-secret"｜"offline"｜"unreachable"`、`needSecret?`（預設 true；本機試用傳 false → 只選身分，`onSubmit` 的 `secret` 為空字串）、`showInstallHint`、`footnote?` | `onSubmit({who, secret})`（「開始使用」與 unreachable 的「再試一次」都呼叫它）。（當時與 App 的 `src/screens/Onboarding.tsx` 相同） |

toast 文案（App 層）：「已記錄：{品項} {數量} {單位}」（例：已記錄：雞肉絲 1 小撮）「已填：全吃完」「已記錄清砂：尿塊 2・便 1・正常」「已記錄體重 3.48 kg」「已記錄：{產品}，下次 2026/10/26」「已送出回報：嘔吐」「已標記解決」「已撤銷（劃掉，可復原）」「已儲存設定」（設定沒有「復原」，因為是明確按儲存）——動作按鈕一律「復原」，5 秒。離線時加「（離線，待上傳）」；連不到後端時加「（連不到後端，待上傳）」。失敗：紅色「…，但沒送出去／已存在手機，不會不見。」＋「重試」。

### 年齡顯示（DESIGN.md §10「估計值不顯示比來源更精細的單位」）

| 生日（今天 2026-09-26） | 確切（`birthday_estimated=false`） | 估計（`true`） |
|---|---|---|
| 2026-09-14 | 12 天 | 未滿 1 個月 |
| 2025-11-01 | 10 個月 25 天 | 約 10 個月 |
| 2025-11-26 | 10 個月 | 約 10 個月 |
| 2025-09-26 | 1 歲 | 約 1 歲 |
| 2024-06-10 | 2 歲 3 個月 | 約 2 歲 3 個月 |
| 空白／格式錯／在未來 | （不顯示） | （不顯示） |

- 月數是日曆月：1/31 出生 → 2/28 滿 1 個月、3/1 是「1 個月 1 天」。
- `birthday_estimated`（Config／Sheet key，布林）。種子資料 2025-11-01 是估計；使用者自己存的生日算確切。舊資料沒有這個 key 時用 `resolveBirthdayEstimated(stored, birthday, "2025-11-01")` 推定：生日還是種子值 → 估計，否則 → 確切。

## 元件 → DESIGN.md 對照

| DESIGN.md | 原型檔案 |
|---|---|
| Button（default／outline／ghost／destructive／success） | `components/ui/button.tsx` |
| Card | `components/ui/card.tsx` |
| Sheet（底部） | `components/ui/sheet.tsx`、`DuplicateWarningSheet`、`EditEntrySheet`、新增食物 |
| Tabs | `components/ui/tabs.tsx`（副食「近期／收藏」） |
| Badge／狀態色 | `components/ui/badge.tsx`（ok／watch／urgent／info／pending／muted）、`StatusBadge` |
| Toggle／ToggleGroup（晶片） | `ChoiceGroup.tsx`、異常回報嚴重度 |
| Input／Textarea／Label | `components/ui/input.tsx`、`textarea.tsx`、`label.tsx` |
| Checkbox | `CheckList.tsx`（尿／便的其他） |
| Sonner toast＋復原 | `components/ui/sonner.tsx`、`App.tsx` |
| Alert（info／urgent／destructive／warning） | `components/ui/alert.tsx`、`NetworkBanner`、`UrgentVetAlert` |
| 連線橫幅四種狀態（§8） | `NetworkBanner.tsx`：連不到後端（warning＋再試一次，用 `onRetry`）／手機離線（info）／沒送出（destructive＋重新送出）／正在補送（info）；同檔 `LocalTrialBanner`＝本機試用頂部橫條（muted，App 殼放最上面並把下方 `--safe-top` 設 0，寫法同 App 的 `src/App.tsx`） |
| Dialog（只給破壞性確認） | `ConfirmDialog.tsx`（設定頁「切換成 Mia」＝清除密鑰） |
| Switch | `components/ui/switch.tsx`（52×32、點擊區 64×44；設定「24 小時營業」） |
| 設定表單列 | `FormSection.tsx`（`FormSection`、`FormRow`） |
| 未儲存提醒 Sheet | `UnsavedChangesSheet.tsx` |
| Skeleton | 首頁載入中 |
| ScreenLayout／BottomActionBar／BottomNav | `ScreenLayout.tsx`、`BottomNav.tsx` |
| 大按鈕磚 | `ActionTile.tsx` |
| 待填卡 | `PendingEatenCard.tsx`＋`EatenPicker.tsx` |
| 列表／時間軸項目 | `TimelineItem.tsx` |
| Stepper ± | `Stepper.tsx`（`step`／`editable`／`unit`，設定的間隔天數）、`LitterQuickRow.tsx` |
| 紅色緊急橫幅＋撥號鈕 | `UrgentVetAlert.tsx`（`clinic?`） |
| 摘要卡＋逾期紅點 | `SummaryCard.tsx`（`OverdueDot`） |
| 照片格 | `PhotoSlots.tsx` |
| 圖表 | `WeightChart.tsx` |
| 示意徽章 | `SampleBadge.tsx` |

## 各畫面狀態（開發要做到）

| 畫面 | 空白 | 待填／進行中 | 載入中 | 錯誤 | 離線 |
|---|---|---|---|---|---|
| 首頁 | 「還沒有紀錄」卡＋大按鈕照常；體重磚「還沒量過」；不顯示待填與最近紀錄 | 待填卡（最新一筆＋「還有 N 筆待填」） | Skeleton 骨架＋「正在讀取最新紀錄⋯」 | 紅框 Alert「讀不到最新紀錄」＋「再試一次」，仍顯示手機內舊資料、仍可記錄；送出失敗＝「有 N 筆沒送出去」＋「重新送出」 | 藍色「手機目前沒有網路」橫幅；連不到後端時黃色「連不到 Google 試算表」＋「再試一次」；記錄照常，toast 標「待上傳」 |
| 副食／零食 | 收藏分頁空：「還沒有收藏」；沒有食物時只剩「＋新增食物」 | 剛記的一筆出現「吃了多少？」卡；其他待填列在「待填剩食」 | 食物清單用本機快取，不擋操作 | 送出失敗 toast＋重試；新增食物名稱／單位空白時按鈕停用 | 同首頁，重複提醒只能比對本機已知資料（顯示為提醒而非保證） |
| 清砂 | 沒有上次值時預填 尿塊 2・便 1 | 展開中：底部固定「記錄異常」（觸發獸醫提示時變紅） | — | 送出失敗 toast＋重試 | 照常記錄、待上傳 |
| 體重 | 沒紀錄：不顯示上次卡；圖表顯示「量兩次以上就會畫出曲線」 | 輸入中：即時差值；不合理數字（非 0.3–15）紅字＋按鈕停用 | — | 送出失敗 toast＋重試 | 照常記錄、待上傳 |
| 驅蟲／疫苗／用藥 | 「還沒有紀錄。展開下方表單記第一筆。」 | 下次日期手改時顯示「已手動修改・改回自動」 | — | 產品空白時「記錄」停用；送出失敗 toast | 照常記錄、待上傳 |
| 異常回報 | 沒有未解決時不顯示清單 | 類別＋嚴重度沒選時送出鈕停用並寫「選好類別和嚴重度就能送出」；照片 3 張時「已達上限」 | 照片上傳中（正式 App）：縮圖上顯示進度，送出鈕顯示「上傳中⋯」 | 照片上傳失敗：縮圖標「沒傳上去」＋重試；紀錄本身仍保留 | 照片先存本機，上線補傳；toast 註明 |
| 7 天紀錄 | 「這 7 天沒有（類別）紀錄。」 | 已撤銷：刪除線＋「已撤銷」＋「復原」 | 列表 Skeleton | 讀取失敗同首頁；個別「沒送出」標示＋橫幅重送 | 每筆「待上傳」標示 |
| 設定 | 診所三欄空白（預設）：只顯示 placeholder「例如：02-1234-5678」，下方說明「填了電話…多一顆『打給診所』按鈕」 | 有變更：「儲存」可按；按返回跳未儲存 Sheet。沒變更：按鈕停用顯示「已儲存」。改生日日期：「生日是估計的」自動關閉，預覽改成確切年齡。電話格式錯／生日空白或在未來：欄位下紅字（`aria-invalid`）、「儲存」停用、未儲存 Sheet 隱藏「儲存後離開」 | 讀 Config 時：沿用本機快取（不擋畫面） | 寫入 Config 失敗：紅色 toast「設定沒存上去」＋「重試」，草稿保留 | 照常儲存到本機，toast「已儲存設定（離線，待上傳）」；上線後補寫 Config 列 |
| 首次開啟 | — | 選身分＋有密鑰才可「開始使用」；「確認中⋯」轉圈；5 秒／20 秒後按鈕下方出現說明灰字，有結果就消失 | 驗證中按鈕停用 | 密鑰錯：「密鑰不對，請跟另一位確認後再輸入一次。」（紅字，`aria-invalid`）；連不到後端：黃色 Alert「網路正常，但連不到 Google 試算表。可能是網址設定有誤，或 Google 暫時沒回應。」＋「再試一次」 | 藍色 Alert「手機目前沒有網路，連上 Wi‑Fi 或行動網路後再試一次。」（本機試用不問密鑰，所以不會出現這三種） |

## iPhone／iOS 注意事項

- `viewport-fit=cover`＋`env(safe-area-inset-*)`（tokens 的 `--safe-top`／`--safe-bottom`）；原型外框以 47／34px 模擬 iPhone 13/14。
- 主要按鈕在底部拇指區；選項與提醒都是底部 Sheet；只有破壞性確認用置中 Dialog。
- 沒有 hover 依賴；按下回饋用 `:active`。
- 所有輸入框 ≥16px（避免自動放大）；體重、公克用 `inputMode="decimal"`。Sheet 開啟不自動聚焦輸入框。
- **iOS PWA 限制**：Web Push 只支援 iOS 16.4 以上，而且必須先「加入主畫面」才能要求權限（v1 沒有推播，不受影響）；standalone 沒有瀏覽器返回鍵，所以每個子畫面都有返回鍵；若只在 Safari 分頁使用（沒加入主畫面），7 天沒開可能被清除網站資料（包含 localStorage 裡的密鑰）；加入主畫面後不受此限，但首次開啟流程仍要能順利重來。
- 電話輸入框 `type="tel"`＋`inputMode="tel"`＋`autoComplete="tel"`（撥號鍵盤）；撥號用 `<a href="tel:…">`，standalone PWA 會跳 iOS 的撥號確認。
- 截圖是用桌面 Chrome 渲染：`<input type="date|time">` 顯示成英文格式（mm/dd/yyyy、PM），iPhone 上會是原生滾輪與中文格式。

## 套件版本（實際安裝）

| 套件 | 版本 |
|---|---|
| react／react-dom | 19.3.0 |
| vite | 8.3.1 |
| @vitejs/plugin-react | 6.1.1 |
| typescript | 6.0.3 |
| tailwindcss／@tailwindcss/vite | 4.3.3 |
| shadcn（CLI） | 4.21.0 |
| radix-ui | 1.6.7 |
| sonner | 2.0.8 |
| lucide-react | 1.48.0 |
| class-variance-authority | 0.7.1 |
| clsx | 2.1.1 |
| tailwind-merge | 3.7.0 |
| tw-animate-css | 1.4.0 |
| next-themes | 0.4.6（shadcn sonner 依賴；原型直接傳 `theme` prop） |
| Node（建置環境） | 20.19.2 |

shadcn 設定：`components.json` 為 style `new-york`、baseColor `neutral`、cssVariables `true`、alias `@/` → `src/`。shadcn CLI 4.x 的 `init` 改成 preset 流程且在無互動環境卡住，所以 `components.json` 是手寫（內容等同 init 結果）、`src/lib/utils.ts` 為 init 會產生的標準 `cn()`；元件用 `npx shadcn@latest add button card sheet tabs badge toggle toggle-group input textarea checkbox sonner alert dialog label separator skeleton switch` 加入（注意：CLI 會把 import 改成 `from "cn"` 並裝一個無關的 `cn` 套件，加完要改回 `@/lib/utils` 並 `npm rm cn`），再依 DESIGN.md 調整（44px、16px、語意變體、Portal 容器、移除 hover-only 樣式）。預設色票不用 neutral，而是由 `docs/design/design-tokens.css` 覆寫。
