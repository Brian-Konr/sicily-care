# 設計系統 v0.4（DESIGN.md）

> **這是「西西里共同照護紀錄」PWA 的設計系統**：色彩、字體、間距、圓角、元件、互動、可近用性與語氣都寫在這裡。
> 規則以本文件為準；**實作以 App 程式碼（repo 根目錄的 `src/`）為正本**——文件和程式不一致時，先看程式碼，再回頭更新本文件。
> 可點原型 `mockup/` 只是設計參考，可能落後於 App，見 [mockup/README.md「原型只是設計參考」](./mockup/README.md#原型只是設計參考app-程式碼才是正本)。

版本：v0.5｜2026-10-09（台北時間）
適用：西西里共同照護紀錄 PWA（使用者 Brian、Mia）。需求與規劃見 [`../spec/plan.md`](../spec/plan.md)、[`../spec/logging-spec.md`](../spec/logging-spec.md)、[`../spec/decisions.md`](../spec/decisions.md)；v1.1 新功能見 [`../spec/v1.1.md`](../spec/v1.1.md)。
技術基準：Vite＋React＋TypeScript＋Tailwind CSS v4＋shadcn/ui（style new-york、base color neutral、CSS variables）。

- **Tokens 檔**：[`design-tokens.css`](./design-tokens.css)（沿用 shadcn 變數命名，含 Tailwind v4 `@theme inline`）。App 建置前 `scripts/sync-tokens.mjs` 會把它複製到 `src/styles/design-tokens.css`，所以不要直接改 `src/styles/` 那份；檔名與位置請保持不變。
- **Tokens 來源＋對比計算**：[`tools/tokens.py`](./tools/tokens.py)（改色只改這裡；`python3 docs/design/tools/tokens.py` 會重寫 CSS 並重算對比，有任何一組不過就 exit 1）
- **對比報告**：[`tools/contrast-report.md`](./tools/contrast-report.md)
- **可點原型**：[`mockup/`](./mockup/)（設計參考，元件照本文件；截圖在 `mockup/screens/`）
- **歷史交接紀錄**：[`handoff/`](./handoff/)（當時從原型搬到 App 的接線 diff，只供參考）

---

## 1. 設計原則

1. **一次點擊完成常見情況**：每天做的事（餵、清砂、補填吃了多少）一點就記好；細節放在「展開」裡，選填。
2. **先記再改，不先問**：一般紀錄不跳確認，靠「復原」toast 和時間軸的「撤銷」補救；只有破壞性動作，以及會改變兩人共用清單的動作（例如封存品項）才確認（§8）。
3. **簡潔溫暖**：暖米色底、柿橘主色、圓角、口語短句。畫面上一次只強調一件事。
4. **狀態一眼看懂，但不只靠顏色**：正常／注意／緊急一律「圖示＋文字＋顏色」。
5. **拇指優先**：主要按鈕放在畫面下半部（底部按鈕列、大按鈕磚），點擊區至少 44×44。
6. **誠實呈現資料狀態**：待填、待上傳、沒送出、示意資料，都要看得出來。

## 2. 平台（iPhone／iOS Safari PWA）

兩位使用者都用 iPhone，所以以 **iOS Safari 加到主畫面（standalone）** 為主要環境：

- **安全區**：`<meta name="viewport" content="…, viewport-fit=cover">`；tokens 提供 `--safe-top: env(safe-area-inset-top)`、`--safe-bottom: env(safe-area-inset-bottom)`。標題列加 `padding-top: var(--safe-top)`（避開瀏海／動態島），底部導覽與按鈕列加 `padding-bottom: var(--safe-bottom)`（避開 Home 指示條）。原型外框用 47px／34px 模擬。
- **拇指區**：子畫面的主要動作放在固定底部的 `BottomActionBar`；首頁大按鈕在畫面中下段；底部導覽只放 2 個目的地。
- **底部 Sheet 取代置中對話框**：選項、提醒、編輯都用 `Sheet side="bottom"`；置中對話框只給確認（破壞性動作，或會改變兩人共用清單的動作，§8），同 iOS 的警告框；全螢幕照片檢視是唯一的滿版例外（§7.4）。
- **不靠 hover**：所有回饋用 `:active`（按下縮到 0.97）與選中狀態；元件已移除 hover-only 樣式。
- **輸入框 ≥16px**：小於 16px iOS 會自動放大畫面。tokens 把 `text-xs`／`text-sm` 也設成 16px，`input, textarea, select` 另設 `font-size: max(16px, 1em)`。
- **數字鍵盤**：體重等小數用 `inputMode="decimal"`；整數用 `inputMode="numeric"`；不要用 `type="number"`（iOS 上有捲動改值與格式問題）。
- **Sheet 開啟時不自動聚焦輸入框**（避免鍵盤突然彈出）：`onOpenAutoFocus={e => e.preventDefault()}`；只有按鈕可以自動聚焦。
- **加到主畫面提示**：首次開啟畫面放簡短步驟（Safari「分享」→「加入主畫面」）。只在 iOS Safari 且非 standalone 時顯示。
- **手勢一定有按鈕替代**：往左滑、雙指放大、往下滑關閉都只是捷徑；同一件事一定還有看得到的 44px 按鈕（列尾「⋯」選單、「關閉」、上一張／下一張）。不知道能滑的人也要做得到。
- **手勢不跟捲動搶**：可滑動的列設 `touch-action: pan-y`（直向捲動交給瀏覽器），水平位移超過 10px、而且大於直向位移才開始拖；全螢幕照片的圖片區設 `touch-action: none`，避免 Safari 把整頁放大；拖動中的元素加 `select-none`，避免長按選到字。
- **sticky 黏在捲動容器裡**：`ScreenLayout` 的捲動容器是 `<main>`，日期標題用 `sticky top-0` 黏在它頂端（iOS Safari 支援）；不捲動的篩選列放在標題列區（§7.5），不要再疊第二層 sticky。
- **滿版高度用 `100dvh`**（`h-dvh`），不用 `100vh`：iOS 的網址列與工具列會讓 `100vh` 超出可見範圍。
- **狀態列**：standalone 的狀態列樣式是整個 App 共用的（`index.html` 沒設 `apple-mobile-web-app-status-bar-style`，用預設值），單一畫面改不了；全螢幕照片檢視一樣在頂端留 `--safe-top`，不把內容畫到狀態列底下。
- **捲到底自動載入**用 `IntersectionObserver`（iOS 12.2 起支援），同時保留看得到的按鈕，觀察器沒觸發時仍可手動載入。
- **iOS 限制**：Web Push 只在 iOS 16.4 以上、而且「加到主畫面後」才可用（v1 不做推播）；standalone 模式沒有瀏覽器上一頁按鈕，每個子畫面都要有自己的返回鍵。

## 3. 色彩 tokens

變數名稱沿用 shadcn/ui；另加 `success`／`warning`／`info` 與各自的 `*-soft` 淺底。`:root` 為淺色，`.dark` 為深色；App 依 `prefers-color-scheme` 切換 `.dark`。

### 3.1 色票

| Token | 用途 | 淺色 | 深色 |
|---|---|---|---|
| `--background` | 頁面底色（暖米） | `#FAF6F1` | `#1A1613` |
| `--foreground` | 主要文字 | `#2B231D` | `#F3EDE6` |
| `--card` / `--card-foreground` | 卡片 | `#FFFFFF` / `#2B231D` | `#25201C` / `#F3EDE6` |
| `--popover` / `--popover-foreground` | Sheet、Dialog | `#FFFFFF` / `#2B231D` | `#2B2621` / `#F3EDE6` |
| `--primary` / `--primary-foreground` | 主色（柿橘）、主要按鈕 | `#B04E26` / `#FFFFFF` | `#F0915F` / `#24120A` |
| `--secondary` / `--secondary-foreground` | 次要按鈕 | `#F3EDE5` / `#2B231D` | `#342D27` / `#F3EDE6` |
| `--muted` / `--muted-foreground` | 次要區塊／次要文字 | `#F3EDE5` / `#675A4E` | `#2E2823` / `#BBAD9F` |
| `--accent` / `--accent-foreground` | 選中狀態（晶片、Toggle） | `#FBE9DF` / `#86381A` | `#3E2519` / `#FFCDB3` |
| `--destructive` / `--destructive-foreground` | **緊急**、刪除 | `#B3261E` / `#FFFFFF` | `#FF8B7D` / `#2E0B07` |
| `--destructive-soft` / `-foreground` | 緊急淺底 | `#FDE8E5` / `#8C1D16` | `#46201B` / `#FFC4BB` |
| `--success` / `--success-foreground` | **正常**、完成 | `#2D7A4B` / `#FFFFFF` | `#6FCB92` / `#0E2417` |
| `--success-soft` / `-foreground` | 正常淺底 | `#E4F2E8` / `#1E5A36` | `#1B3225` / `#A9E5BE` |
| `--warning` / `--warning-foreground` | **注意** | `#8A5700` / `#FFFFFF` | `#F0B84E` / `#2A1C00` |
| `--warning-soft` / `-foreground` | 注意淺底、示意徽章 | `#FDF1D6` / `#6E4500` | `#3A2C10` / `#F9D891` |
| `--info` / `--info-foreground` | 資訊、離線 | `#2A5FA5` / `#FFFFFF` | `#82B3F0` / `#0B1E36` |
| `--info-soft` / `-foreground` | 資訊淺底 | `#E4EDF9` / `#1F4A82` | `#172A41` / `#BCD7F8` |
| `--border` | 裝飾性分隔線 | `#E6DCD0` | `#3B342D` |
| `--input` | 輸入框／外框按鈕邊線（需 3:1） | `#8C7B6B` | `#8F8173` |
| `--ring` | 焦點外框 | `#2A5FA5` | `#82B3F0` |
| `--overlay` | Sheet／Dialog 遮罩 | `rgba(43,35,29,.48)` | `rgba(0,0,0,.62)` |

### 3.2 狀態色（正常／注意／緊急）

| 狀態 | Token | 圖示（lucide） | 用法 |
|---|---|---|---|
| 正常 | `success`（淺底 `success-soft`） | `CheckCircle2` | 「一切正常 ✓」、已解決、清砂正常 |
| 注意 | `warning`（淺底 `warning-soft`） | `TriangleAlert` | 重複餵食提醒、軟便、快到期（3 天內）、今天到期 |
| 緊急 | `destructive`（實心） | `OctagonAlert`／`Siren` | 「請盡快聯絡獸醫」、逾期紅點（已逾期） |
| 資訊（補充） | `info` | `Eye`／`CloudOff` | 嚴重度「觀察」、離線 |

規則：狀態一定同時有**圖示＋文字**；紅點旁一定有文字（例如「● 已經 16 天沒量了」）。

**到期判斷（全 App 統一，v0.5）**：剩 N 天＝下次日期 − 今天（台北日曆日）。

| 條件 | 狀態 | 呈現 |
|---|---|---|
| N < 0 | 緊急（已逾期） | `OverdueDot`：紅點＋粗體 `destructive` 字「已逾期 N 天」 |
| N = 0 | 注意 | `StatusBadge tone="watch"`「今天到期」 |
| 1 ≤ N ≤ **3** | 注意（快到期） | `StatusBadge tone="watch"`「還有 N 天」 |
| N > 3 | 正常 | `muted-foreground` 灰字「還有 N 天」，不加徽章（正常不搶眼） |
| 從來沒有紀錄 | 中性 | 灰字「還沒記錄過」，**不算逾期** |

快到期門檻 **3 天**沿用驅蟲／疫苗（`Med.tsx` 與首頁「下次驅蟲」卡的 `daysLeft <= 3`），所有週期提醒都用同一個數字，不要另訂。

### 3.3 對比（程式計算，WCAG 2.x 相對亮度）

以下由 `tools/tokens.py` 產生；文字門檻 4.5:1（AA），非文字元件（邊線、焦點、紅點）3:1。**全部通過。**

| 組合 | 用途 | 淺色 前景/背景 | 淺色對比 | 深色 前景/背景 | 深色對比 | 門檻 | 通過 |
|---|---|---|---|---|---|---|---|
| `--foreground` on `--background` | 內文 | #2B231D / #FAF6F1 | **14.34:1** | #F3EDE6 / #1A1613 | **15.47:1** | ≥4.5:1 | ✓ |
| `--card-foreground` on `--card` | 卡片內文 | #2B231D / #FFFFFF | **15.43:1** | #F3EDE6 / #25201C | **13.88:1** | ≥4.5:1 | ✓ |
| `--popover-foreground` on `--popover` | Sheet／Popover 內文 | #2B231D / #FFFFFF | **15.43:1** | #F3EDE6 / #2B2621 | **12.89:1** | ≥4.5:1 | ✓ |
| `--muted-foreground` on `--background` | 次要文字（頁面底色） | #675A4E / #FAF6F1 | **6.20:1** | #BBAD9F / #1A1613 | **8.21:1** | ≥4.5:1 | ✓ |
| `--muted-foreground` on `--card` | 次要文字（卡片） | #675A4E / #FFFFFF | **6.67:1** | #BBAD9F / #25201C | **7.37:1** | ≥4.5:1 | ✓ |
| `--muted-foreground` on `--muted` | 次要文字（muted 區塊） | #675A4E / #F3EDE5 | **5.73:1** | #BBAD9F / #2E2823 | **6.64:1** | ≥4.5:1 | ✓ |
| `--muted-foreground` on `--popover` | 次要文字（Sheet） | #675A4E / #FFFFFF | **6.67:1** | #BBAD9F / #2B2621 | **6.84:1** | ≥4.5:1 | ✓ |
| `--primary-foreground` on `--primary` | Button default | #FFFFFF / #B04E26 | **5.30:1** | #24120A / #F0915F | **7.65:1** | ≥4.5:1 | ✓ |
| `--primary` on `--background` | 主色文字／連結（頁面底色） | #B04E26 / #FAF6F1 | **4.92:1** | #F0915F / #1A1613 | **7.64:1** | ≥4.5:1 | ✓ |
| `--primary` on `--card` | 主色文字（卡片）、outline 按鈕文字 | #B04E26 / #FFFFFF | **5.30:1** | #F0915F / #25201C | **6.85:1** | ≥4.5:1 | ✓ |
| `--secondary-foreground` on `--secondary` | Button secondary | #2B231D / #F3EDE5 | **13.27:1** | #F3EDE6 / #342D27 | **11.65:1** | ≥4.5:1 | ✓ |
| `--accent-foreground` on `--accent` | Toggle 選中、晶片選中 | #86381A / #FBE9DF | **6.87:1** | #FFCDB3 / #3E2519 | **9.87:1** | ≥4.5:1 | ✓ |
| `--destructive-foreground` on `--destructive` | Button destructive、緊急 Alert（請聯絡獸醫） | #FFFFFF / #B3261E | **6.54:1** | #2E0B07 / #FF8B7D | **7.92:1** | ≥4.5:1 | ✓ |
| `--destructive` on `--card` | 緊急文字（卡片） | #B3261E / #FFFFFF | **6.54:1** | #FF8B7D / #25201C | **7.10:1** | ≥4.5:1 | ✓ |
| `--destructive` on `--background` | 緊急文字／逾期紅點說明 | #B3261E / #FAF6F1 | **6.07:1** | #FF8B7D / #1A1613 | **7.91:1** | ≥4.5:1 | ✓ |
| `--destructive-soft-foreground` on `--destructive-soft` | 緊急淺底 Badge | #8C1D16 / #FDE8E5 | **7.75:1** | #FFC4BB / #46201B | **9.35:1** | ≥4.5:1 | ✓ |
| `--success-foreground` on `--success` | 成功實心（一切正常 ✓） | #FFFFFF / #2D7A4B | **5.25:1** | #0E2417 / #6FCB92 | **8.29:1** | ≥4.5:1 | ✓ |
| `--success` on `--card` | 正常文字 | #2D7A4B / #FFFFFF | **5.25:1** | #6FCB92 / #25201C | **8.17:1** | ≥4.5:1 | ✓ |
| `--success-soft-foreground` on `--success-soft` | 正常 Badge | #1E5A36 / #E4F2E8 | **7.07:1** | #A9E5BE / #1B3225 | **9.57:1** | ≥4.5:1 | ✓ |
| `--warning-foreground` on `--warning` | 注意實心 | #FFFFFF / #8A5700 | **6.10:1** | #2A1C00 / #F0B84E | **9.23:1** | ≥4.5:1 | ✓ |
| `--warning` on `--card` | 注意文字 | #8A5700 / #FFFFFF | **6.10:1** | #F0B84E / #25201C | **8.96:1** | ≥4.5:1 | ✓ |
| `--warning-soft-foreground` on `--warning-soft` | 注意 Badge／重複餵食提醒／示意徽章 | #6E4500 / #FDF1D6 | **7.45:1** | #F9D891 / #3A2C10 | **9.86:1** | ≥4.5:1 | ✓ |
| `--info-foreground` on `--info` | 資訊實心 | #FFFFFF / #2A5FA5 | **6.41:1** | #0B1E36 / #82B3F0 | **7.70:1** | ≥4.5:1 | ✓ |
| `--info` on `--card` | 資訊文字 | #2A5FA5 / #FFFFFF | **6.41:1** | #82B3F0 / #25201C | **7.42:1** | ≥4.5:1 | ✓ |
| `--info-soft-foreground` on `--info-soft` | 資訊 Alert（離線） | #1F4A82 / #E4EDF9 | **7.53:1** | #BCD7F8 / #172A41 | **9.84:1** | ≥4.5:1 | ✓ |
| `--input` on `--card` | 輸入框／外框按鈕邊線（1.4.11 非文字） | #8C7B6B / #FFFFFF | **4.07:1** | #8F8173 / #25201C | **4.27:1** | ≥3.0:1 | ✓ |
| `--input` on `--background` | 輸入框邊線（頁面底色） | #8C7B6B / #FAF6F1 | **3.78:1** | #8F8173 / #1A1613 | **4.76:1** | ≥3.0:1 | ✓ |
| `--ring` on `--background` | 焦點外框 | #2A5FA5 / #FAF6F1 | **5.95:1** | #82B3F0 / #1A1613 | **8.27:1** | ≥3.0:1 | ✓ |
| `--ring` on `--card` | 焦點外框（卡片） | #2A5FA5 / #FFFFFF | **6.41:1** | #82B3F0 / #25201C | **7.42:1** | ≥3.0:1 | ✓ |
| `--destructive` on `--card` | 逾期紅點（非文字，另附文字） | #B3261E / #FFFFFF | **6.54:1** | #FF8B7D / #25201C | **7.10:1** | ≥3.0:1 | ✓ |

注意：Tailwind 的透明度修飾（例如 `bg-primary/90`）會降低對比，系統元件已移除；新增樣式請不要在文字底色上用透明度。

### 3.4 中性反白與局部深色（v0.5，不新增 token）

- **中性反白**＝`bg-foreground text-background`。對比等於 `--foreground` on `--background`（淺色 14.34:1、深色 15.47:1，見上表）。用在 Sonner toast 和往左滑露出的「封存」動作區。它不帶正常／注意／緊急的意思，適合「可以復原、不危險」的動作。
- **局部深色**：在元素加上 `dark` class，子樹的 tokens 就換成深色值（tokens 的 `.dark { … }` 與 `@custom-variant dark (&:where(.dark, .dark *))` 已支援）。全螢幕照片檢視用這個方式拿到深色底（`bg-background` 變成 `#1A1613`），**不另外新增「黑色」token**；裡面的按鈕、文字自動用深色那組已驗證的對比。

## 4. 字體

```css
--font-sans: -apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", "Noto Sans CJK TC", "Microsoft JhengHei", "Heiti TC", system-ui, sans-serif;
--font-num:  ui-rounded, "SF Pro Rounded", -apple-system, …;   /* 數字（體重、時間），iPhone 上是圓體數字 */
```

| Tailwind | 大小／行高 | 用途 |
|---|---|---|
| `text-3xl` | 32／40 | 體重大數字 |
| `text-2xl` | 24／32 | 首頁貓名、摘要數字 |
| `text-xl` | 20／28 | 畫面標題、Sheet 標題 |
| `text-lg` | 18／28 | 卡片標題、按鈕磚文字、大按鈕 |
| `text-base` | **16／24** | 內文（最小值） |
| `text-sm`、`text-xs` | 16／24 | 刻意等於 16px，讓 shadcn 預設的小字不會出現 |

- App 內任何文字 ≥16px（含時間、徽章、備註）。層級靠字重（400／500／700）和顏色（`foreground`／`muted-foreground`），不靠縮小字。
- 中文行高 ≥1.5；標點用全形；數字與中文之間留半形空格（「12 天前」「3.42 kg」）。

## 5. 間距

4px 基準（Tailwind `--spacing: 0.25rem`）：`1`=4、`2`=8、`3`=12、`4`=16、`5`=20、`6`=24、`8`=32、`10`=40、`12`=48、`16`=64。

- 畫面左右邊距 16（`px-4`）；卡片內距 16；卡片之間 16（`space-y-4`）；區塊標題上方 20–24。
- 點擊區：最小 44（`--touch-min`），標準控制項高 48（`--control-h`，`h-12`），大按鈕 56（`size="lg"`），按鈕磚 ≥96（`--tile-min-h`）。
- 相鄰可點元件間距 ≥8。

## 6. 圓角／陰影

- `--radius: 0.75rem`（12px）→ `rounded-sm` 8、`rounded-md` 10、`rounded-lg` 12、`rounded-xl` 16、`rounded-2xl` 24；晶片與徽章 `rounded-full`。
- 卡片 `rounded-xl`；按鈕 `rounded-md`（大按鈕 `rounded-lg`）；底部 Sheet 上緣 `rounded-t-2xl`。
- 陰影為暖色調：`shadow-sm`（卡片）、`shadow-md`（toast、緊急橫幅）、`shadow-lg`（Sheet，向上）。深色模式以邊線為主、陰影為輔。

## 7. 元件

### 7.1 shadcn/ui 元件（本系統調整後）

原始碼在 `src/components/ui/`（shadcn 的做法是把元件複製進專案，這裡有改過；更新 shadcn 時請保留以下調整）。

| 元件 | 本系統用法與調整 |
|---|---|
| **Button** | 變體：`default`（主要，柿橘實心）、`outline`（次要，白底＋`input` 邊線＋主色字）、`secondary`、`ghost`（文字按鈕，如「編輯」「撤銷」）、`destructive`、`success`（「一切正常 ✓」）、`warning`、`link`。尺寸：`default` 48、`sm` 44、`lg` 56、`icon` 44。已移除 `xs`／`icon-xs`（小於 44）。按下 `active:scale-[0.97]`（減少動態時關閉）。 |
| **Card** | 內容分組。`rounded-xl`、`border`、`shadow-sm`。 |
| **Sheet**（`side="bottom"`） | 所有選項／提醒／編輯。頂端握把、`rounded-t-2xl`、最高 88%、底部留 `--safe-bottom`；遮罩 `--overlay`；關閉鈕 44×44、文字「關閉」。 |
| **Tabs** | 同一畫面的兩三個分頁（例如「近期／收藏」）。高 52，觸發區 ≥44。 |
| **Badge** | 狀態徽章：`ok`（正常）、`watch`（注意）、`urgent`（緊急）、`info`、`pending`（待填）、`muted`。16px 粗體，搭配圖示。 |
| **Toggle / ToggleGroup** | 單選／複選晶片（`variant="outline"`，`spacing={2}`）。選中＝`accent` 底＋2px 主色外框＋粗體（不只靠顏色）。高 ≥44。 |
| **Input / Textarea** | 高 48、`bg-card`、`border-input`（3:1）、16px。錯誤時 `aria-invalid` → 紅框＋下方紅字說明。 |
| **Checkbox** | 24×24，放在整列可點的 `label` 裡（列高 ≥44）。用於「可複選」清單。 |
| **Sonner（toast）** | 記錄成功的回饋，含「復原」動作。深色底（`foreground`）淺色字（§3.4 中性反白）；動作按鈕 44 高。位置：底部導覽／按鈕列上方。同時最多 1 則。z-index 在 Sheet 遮罩之下。 |
| **Alert** | 變體：`info`（離線）、`warning`、`success`、`destructive`（讀取失敗）、`urgent`（實心紅：請盡快聯絡獸醫）。 |
| **Dialog** | v0.5 起只用在全螢幕照片檢視的滿版容器（§7.4）。確認對話框一律用 `ConfirmDialog`（底層改成 AlertDialog，見下一列）。其他情況一律用 Sheet。 |
| **AlertDialog**（v0.5 新增） | 需要使用者明確回答的確認：`role="alertdialog"`、點遮罩不會關閉、`Esc`＝取消。只透過 `ConfirmDialog` 使用。用 `npx shadcn@latest add alert-dialog` 加入（`radix-ui` 套件已內含 `@radix-ui/react-alert-dialog`，不新增依賴）；按鈕換成本系統的 `Button`（48 高），標題 `text-xl font-bold`，容器 `rounded-2xl bg-popover`。 |
| **DropdownMenu**（v0.5 新增） | 列尾「⋯」選單。觸發鈕 `Button variant="ghost" size="icon"`（44×44）；選單 `align="end"`、`sideOffset={4}`、`bg-popover rounded-lg shadow-md`；每個項目最小高 44、16px、左側 lucide 圖示 20px＋文字。用 `npx shadcn@latest add dropdown-menu` 加入（同樣不新增依賴）；移除 hover-only 樣式，保留 `focus:bg-accent`。只有不可逆的危險項目才用 `variant="destructive"`，「封存」不是。 |
| **Switch** | 開／關設定（例如「24 小時營業」）。52×32、拇指 26px；`::after` 把點擊區外擴到 64×44。一定放在 `FormRow` 裡、以 `htmlFor` 綁標籤：標籤撐滿整列左側，所以**整列都能點**。開啟＝主色底＋拇指靠右（不只靠顏色）。在設定頁裡它跟其他欄位一起等「儲存」，不即時生效。 |
| **Skeleton** | 載入佔位。形狀照真實內容：清單列 `h-16 rounded-lg`、照片 `aspect-square rounded-lg`、卡片 `rounded-xl`。骨架本身 `aria-hidden`，外層容器 `aria-busy="true"`，旁邊一定有文字說明（§8「長等待要說明」）。減少動態時 tokens 已停掉脈動。 |
| Label、Separator | 表單標籤、分隔。 |

另外：`PortalContainerContext`（`ui/portal-context.tsx`）讓 Sheet／Dialog 掛進指定容器；正式 App 不需要設定。

### 7.2 組合元件（composites）

| 元件 | 說明 |
|---|---|
| `ScreenLayout` | 畫面骨架：安全區、標題列（返回鍵＋標題＋示意徽章）、橫幅、可捲內容、底部拇指區。v0.5 新增 `toolbar` 插槽：在橫幅下方、跟標題列一起固定（放篩選晶片列，§7.5）。 |
| `BottomActionBar` | 子畫面固定底部的主要按鈕列。 |
| `BottomNav` | 底部導覽（最多 2–4 個目的地；目前「首頁／紀錄」。v1.1 起時間軸可以一直往前捲，標籤由「7 天紀錄」改成「紀錄」）。 |
| `ActionTile`（大按鈕磚） | 首頁 2 欄大按鈕，emoji＋標題＋提示；`primary` 橫跨兩欄給最常用動作；可帶紅點＋文字。 |
| `LastActivityCard` | 「上次餵食：Mia 18:05｜30 分鐘前」。 |
| `PendingEatenCard`（待填卡） | 虛線主色外框＝還沒完成；內含 `EatenPicker`，點一下就完成。 |
| `EatenPicker` | 5 選 1：全吃完／吃大半／一半／一點點／沒吃（圓餅圖示＋文字）。 |
| `Stepper`（± 調整器） | 兩顆 44×44 按鈕夾數字；到上下限時停用。大數字用 `step`（例如間隔天數每按一次 ±15／±30）＋`editable`（中間是可直接輸入的數字框，`inputMode="numeric"`，輸入值夾在上下限內）＋`unit`（「天」）。 |
| `LitterQuickRow` | 「尿塊 [− 2 +]・便 [− 1 +]＋一切正常 ✓」一鍵列。 |
| `ChoiceSingle`／`ChoiceMulti` | ToggleGroup 包裝的晶片組（wrap／grid／list 版面；v0.5 新增 `scroll`：單行水平捲動，見 §7.5）。 |
| `CheckList` | Checkbox 複選清單，可標重點選項。 |
| `SummaryCard`＋`OverdueDot` | 可點的摘要卡（體重、下次驅蟲）；逾期紅點＋文字。 |
| `StatusBadge` | 正常／注意／緊急等狀態徽章（圖示＋文字）。 |
| `TimelineItem`／`TimelineList` | 時間｜圖示｜內容＋記錄人＋狀態；撤銷後刪除線＋「已撤銷」＋「復原」。另顯示「待上傳」「沒送出」。v0.5 起也用在完整歷史（§7.5）；新增居家維護（`Care`）類型：emoji 🧽、標題＝項目名稱。 |
| `DuplicateWarningSheet` | 「Mia 30 分鐘前給過零食，還要記錄嗎？」主要按鈕＝安全選項「不用了，不記錄」。 |
| `UrgentVetAlert`（紅色緊急橫幅） | 實心紅底、警笛圖示、粗體「請盡快聯絡獸醫」＋一句原因與行動；`role="alert"`。**有診所電話時**多一顆滿版撥號鈕：反白（紅底上的白底紅字）、56 高、電話圖示＋「打給 {診所名}」，是 `<a href="tel:…">`；下面一行電話號碼＋（24 小時營業時）外框「24 小時」徽章。**沒有電話時不顯示按鈕**，只有一句不可點的提示「之後可以到「設定」填診所電話…」（緊急時不把人帶離表單）。 |
| `NetworkBanner` | 四種狀態：手機離線（info）／連不到後端（warning＋「再試一次」）／沒送出（destructive＋重新送出）／本機試用（muted，固定頂部）。 |
| `PhotoSlots` | 最多 3 張照片格，縮圖右上 44px 移除鈕。 |
| `WeightChart` | 純 SVG 折線圖，附文字摘要（`aria-label`）。 |
| `EditEntrySheet` | 編輯一筆紀錄（時間、備註＋類型欄位）。 |
| `ConfirmDialog` | 確認對話框（v0.5 起用 AlertDialog）。新增 `confirmVariant`：`destructive`（預設，紅色，用於破壞性動作，例如清除密鑰）／`default`（主色，用於可以復原、但會改變兩人共用清單的動作，例如封存品項）。按鈕兩欄：左「取消」（outline，預設焦點）、右確認（動詞，不寫「確定」）。 |
| `FormSection`／`FormRow`（設定表單列） | iOS「設定」風格：小標題（可帶右側徽章，如「選填」「示意預設」）＋一張卡片、列與列之間分隔線＋卡片下方說明。`FormRow` 兩種版面：inline（左標籤、右控制項，列高 ≥56，用於 Switch／Stepper／按鈕）與 `stack`（標籤在上、輸入框滿版，用於文字／電話／日期）。每列可帶 `hint`（灰字）或 `error`（紅字、`role="alert"`，取代 hint）。 |
| `UnsavedChangesSheet`（未儲存提醒） | 有未儲存變更時按返回 → 底部 Sheet（**不用 Dialog**，離開不會毀掉紀錄）：標題「還沒儲存，要離開嗎？」；按鈕由上而下「儲存後離開」（主要；欄位有錯時隱藏）、「不儲存，直接離開」（outline＋紅字）、「繼續編輯」（ghost）。點遮罩／下滑＝繼續編輯。 |
| `SampleBadge` | 「示意資料」虛線徽章。 |
| `ListRow`（清單列） | 所有清單列的共同結構，見下方「清單列結構」。 |
| `DueStatus`（到期狀態） | 依 §3.2「到期判斷」輸出狀態文字＋樣式（已逾期／今天到期／還有 N 天／還沒記錄過）。週期提醒一律用它，不在畫面裡各寫一套。 |
| `RecurringItemRow`（週期追蹤列） | 週期性家務／保健的共用列：名稱＋`DueStatus`＋「上次：9/24（四）・Mia」＋列尾一鍵按鈕。居家維護卡（§7.3）使用；驅蟲／疫苗（Med 畫面與首頁「下次驅蟲」卡）在 v1.1 **一併改用** `DueStatus` 的文案（已逾期 N 天／今天到期／還有 N 天），不再用「逾期 N 天／明天／N 天後」。 |
| `CareCard`（居家維護卡） | 首頁一張卡列出幾個週期項目，見 §7.3。 |
| `IssueDetail`（異常詳情頁） | 見 §7.4。 |
| `PhotoThumb`（照片縮圖） | 延遲載入的照片格，有載入中／已載入／失敗／離線／看不到／待上傳等狀態，見 §7.4。和 `PhotoSlots`（選照片用）分開。 |
| `PhotoViewer`（全螢幕照片檢視） | 深色滿版、可縮放、可左右換張、往下滑關閉，見 §7.4。 |
| `FilterChips`（篩選晶片列） | `ChoiceMulti` 新增 `layout="scroll"`：單行、水平捲動、複選，見 §7.5。 |
| `DayHeader`（日期標題） | 黏在捲動容器頂端的日期分組標題，見 §7.5。 |
| `ListEndState`（清單尾端狀態） | 清單最後一次只顯示一種：可以再載入／載入中／沒有更多／離線／失敗／需要更新後端，見 §7.5。 |
| `SwipeRow`（可滑動列） | 往左滑露出一個動作；一定搭配 `RowMenu`，見 §7.6。 |
| `RowMenu`（列尾「⋯」選單） | `DropdownMenu`，是手勢的替代操作，見 §7.6。 |
| `WaitHint`（長等待說明） | §8「長等待要說明」抽成共用元件：`useWaitSeconds(busy)`＋`hint5`／`hint20` 兩段文案，`aria-live="polite"`，16px 灰字置中。v1.1 有三處要用（首次開啟、照片、更早的紀錄），所以現在抽出來；Onboarding 改用它，文案不變。 |
| `UpdateNeededNote`（需要更新後端） | 後端版本不夠（`read` 回傳的 `version` 小於 2，舊後端沒有這個欄位）時，新功能的位置改放這個：`Alert variant="info"`＋`Info` 圖示，標題「需要更新 Apps Script 才能{做這件事}。」，內文「其他紀錄照常可以用。」不放任何會送出請求的按鈕，也不讓整個畫面壞掉。 |

**清單列結構（`ListRow`）**

- 容器：`<ul className="divide-y overflow-hidden rounded-xl border bg-card">`。
- 列分三區：前（選填：時間 `w-[3.1em] font-num font-bold`，或 emoji 22px `aria-hidden`）｜主體（標題 `font-medium`；下一行起是 `text-muted-foreground` 說明，項目之間用「・」）｜尾（**最多一個**控制項，44px）。
- 內距：有尾端按鈕 `py-2 pr-2 pl-4`，沒有就 `px-4 py-3`；兩行以上的列最小高 56。文字可以換行，名稱不截斷（Safari 文字放大 150% 也要看得完整）。
- 整列可點（進詳情）時：整列是一個 `<button>`／連結，尾端放 `ChevronRight`（24px，muted），**可點區裡不再放其他按鈕**；需要另外的按鈕時，可點區只包主體，按鈕放在旁邊當兄弟元素。
- 尾端一鍵動作用 `Button variant="outline" size="sm"`：圖示＋動詞，`aria-label` 帶項目名稱（例如「已清洗：貓砂盆整盆清洗」）。其他動作收進 `RowMenu`。
- 已撤銷／已封存的列：`bg-muted`、標題 `text-muted-foreground`（撤銷另加刪除線）＋`StatusBadge tone="muted"`（「已撤銷」「已封存」）。

### 7.3 居家維護卡片（`CareCard`，首頁）

**決定：首頁不加第六顆大按鈕**，改成一張「居家維護」卡，列出三個週期項目：貓砂盆整盆清洗、餵食器清潔、換乾燥劑。這些是大約每月一次的家務，不該跟每天的記錄搶拇指區；首頁大按鈕維持 v1 的五顆。

- **位置**：首頁摘要卡（體重、下次驅蟲）之後、「最近紀錄」之前。**位置固定**，不因逾期而往上移（版面不跳，兩個人都知道去哪裡找）。
- **結構**：`Card`（`gap-0 p-0`）
  - 標題列 `flex items-center px-4 pt-4 pb-1`：`h2`「🧽 居家維護」（`text-lg font-bold`，emoji `aria-hidden`）；右側 `Button variant="ghost" size="sm"`「紀錄 ›」，開紀錄頁並只選「居家維護」晶片（§7.5）。
  - 標題下一行灰字摘要（`px-4 pb-3`）：「1 項已逾期・1 項快到期」；都沒到期寫「都還沒到期」；有沒記錄過的項目時加「・1 項還沒記錄過」。摘要只用文字，不上色（各列自己有狀態）。
  - 列：`<ul className="divide-y border-t">`＋每個項目一列 `RecurringItemRow`。
- **列順序固定**：貓砂盆整盆清洗 → 餵食器清潔 → 換乾燥劑。**不依逾期排序**：只有幾列、一眼看得完，排序沒有好處；而且一鍵記完後那一列會跳位，手指下的按鈕變成別列，容易連點記錯。逾期由每列的紅點＋文字和標題摘要表達。
- **不收合**：一直展開。按鈕要在「做完的那天」隨時按得到（例如提早換乾燥劑），收起來會多一步，也看不到上次日期。
- **每一列**（`RecurringItemRow`，`flex items-center gap-3 py-3 pr-2 pl-4`）：
  - 第 1 行：名稱 `font-medium`。
  - 第 2 行：`DueStatus`（§3.2 表格：已逾期 N 天／今天到期／還有 N 天／還沒記錄過）。
  - 第 3 行：灰字「上次：9/24（四）・Mia」（今天、昨天直接寫：「上次：今天・Mia」；跨年「上次：2025/12/30・Mia」）。沒記錄過時寫「點右邊的按鈕記第一次」。還在離線佇列時尾端加 info 色「・待上傳」（`CloudOff` 16px），和時間軸一樣。
  - 列尾：`Button variant="outline" size="sm"`（44 高）＋`Check` 圖示＋「已清洗」／「已清潔」／「已換」；`aria-label` 帶項目名稱（「已清洗：貓砂盆整盆清洗」）。每一列都用 outline，逾期也不改成實心主色（狀態已經由文字和紅點表達，首頁不再多一顆柿橘主按鈕）。
- **計算**：下次日期＝這個項目最後一筆未撤銷紀錄的日期（台北日曆日）＋間隔天數；N＝下次日期 − 今天。不另外存 `next_due`。門檻 3 天（§3.2）。
- **一鍵記錄**：點了立刻以現在時間寫入，不確認。該列馬上更新（「還有 30 天」「上次：今天・Mia」）。
  - toast「已記錄：貓砂盆整盆清洗，下次 11/8（日）」＋「復原」，停留 5 秒（`--undo-window`）；格式同驅蟲的「已記錄：…，下次 …」。復原＝軟刪除，那一列改回用前一筆計算。
  - 防連點：寫入後 5 秒內，該列按鈕變成停用的「✓ 已記錄」（文字說明狀態，不只是變灰）；toast 消失或按了「復原」就恢復原樣。
  - 離線照常記錄（進離線佇列），toast 用既有的離線文案。
- **補記／改日期**：到紀錄頁對那一筆按「編輯」改日期（`EditEntrySheet`）；卡片上不另外放日期選擇。
- **狀態**：首頁讀取中 → 這張卡換成一個 `Skeleton h-48 rounded-xl`。後端版本不夠（§8） → 標題列照常，下面只放 `UpdateNeededNote`「需要更新 Apps Script 才能記錄居家維護。」，不顯示列與按鈕。

示意（今天 10/9（五），間隔都是 30 天）：

```
🧽 居家維護                         紀錄 ›
1 項已逾期・1 項快到期・1 項還沒記錄過
─────────────────────────────────────
貓砂盆整盆清洗                [✓ 已清洗]
● 已逾期 2 天
上次：9/7（一）・Brian
─────────────────────────────────────
餵食器清潔                    [✓ 已清潔]
[⚠ 還有 2 天]
上次：9/11（五）・Mia
─────────────────────────────────────
換乾燥劑                        [✓ 已換]
還沒記錄過
點右邊的按鈕記第一次
```

**設定頁：「居家維護」群組**

- `FormSection id="care" title="居家維護"`，放在「驅蟲／疫苗間隔」之後、「身分」之前。
- description：「單位是天。從上次做完那天開始算，到期前 3 天首頁會提醒。」
- 每個項目一列 inline `FormRow`（「貓砂盆整盆清洗」「餵食器清潔」「換乾燥劑」），控制項是 `Stepper`：`editable`、`unit="天"`、`min={1}`、`max={365}`、`step={5}`、預設 **30**（Config `litter_wash_int_days`、`feeder_clean_int_days`、`desiccant_int_days`）。中間的數字框 `inputMode="numeric"`（數字鍵盤），輸入值自動夾在 1–365；`label` 用「貓砂盆整盆清洗間隔」這種完整名稱（螢幕報讀用，`showLabel={false}`）。
- 跟其他設定一起等底部「儲存」，不即時生效。不加「示意預設」徽章（30 天是規格訂的預設值，不是示意）。
- 後端還沒更新時：三個 Stepper **照常可以改、可以儲存**（舊版 `setConfig` 接受任意 key）；description 不變。

### 7.4 異常詳情頁（`IssueDetail`）與全螢幕照片檢視（`PhotoViewer`）

**入口**：異常回報畫面的「還沒解決」卡和「已解決」列都可以點進詳情（hash 路由 `#issue/{id}`）。

- 「還沒解決」卡：上半部（類別、時間・人、嚴重度徽章）整塊是一個 `<button>`，右側加 `ChevronRight`；「標記已解決」按鈕留在卡片下方，不包在可點區裡（`ListRow` 規則）。
- 「已解決」列：主體可點進詳情；列尾「改回未解決」圖示鈕不變。

**詳情頁版面**（`ScreenLayout title="異常詳情" onBack backLabel="異常回報"`，由上而下）：

1. **標題區**：`text-xl font-bold`「嘔吐・毛球」（類別・細項）；下一行兩個徽章：嚴重度 `StatusBadge`（觀察 `info`、要注意 `watch`、緊急 `urgent`，同列表）＋狀態（`ok`「已解決」或 `pending`「還沒解決」）。
2. **資料卡**（`Card`，內部 `<dl>`，每列 `grid grid-cols-[5em_1fr] gap-x-3`，`dt` 灰字、`dd` 一般字）：
   - 時間：7 天內用「今天 18:05」「昨天 21:10」（`fmtWhen`）；更早「9/24（四）18:05」；不是今年「2025/12/30 18:05」。
   - 記錄人：「Mia」。
   - 備註：照原文顯示（保留換行）；沒有就灰字「沒有備註」。
3. **照片區**（有照片才顯示）：`h2`「照片（3）」（`text-lg font-bold`）→ `grid grid-cols-3 gap-2` 的 `PhotoThumb` → 下方一行狀態說明（見下表，一次只顯示一行）→ `Button variant="link"`「在 Google Drive 開啟」＋`ExternalLink` 圖示（只在 `photo_urls` 有值時顯示；這是備用方式，iPhone 主畫面 App 會跳到 Safari，可能要再登入）。
4. **次要動作**（內容最後，`-ml-3 flex gap-1`，和時間軸同樣的順序）：`ghost sm`「編輯」（`Pencil`，開 `EditEntrySheet`）、「撤銷」（`Undo2`）。撤銷不確認：toast「已撤銷（劃掉，可復原）」＋「復原」；頁面不關，標題加刪除線、多一個 `muted`「已撤銷」徽章，次要動作換成「復原」（`RotateCcw`）。
5. **`BottomActionBar`**：還沒解決＝`size="lg"` 主要按鈕「標記已解決」（`Check`）；已解決＝`variant="outline"`「改回未解決」（`RotateCcw`）；已撤銷時不顯示。toast 沿用現有文案（「已標記解決」＋「復原」／「已改回未解決」）。

- 找不到這筆（例如連結過期）：置中灰字「找不到這筆回報，可能已經撤銷了。」＋`Button variant="outline"`「回異常回報」。

**照片縮圖 `PhotoThumb`**：`aspect-square overflow-hidden rounded-lg border`，整格是 `<button>`。進到詳情頁才開始抓（`getPhoto`，由 Apps Script 回傳，可能要 10–30 秒）；同一筆最多 3 張同時抓。抓到的存在手機快取，下次直接顯示；還在待傳清單裡的照片直接顯示手機裡的那份。

| 狀態 | 縮圖格 | 格子下方說明（灰字 16px，`aria-live="polite"`） | 可以做的事 |
|---|---|---|---|
| 載入中 | `Skeleton`（`aspect-square`） | 用 `WaitHint`：約 5 秒「照片要從 Google 取回，第一次比較慢，最多約半分鐘。」約 20 秒「還在讀取照片，請稍等，不用離開這頁。」 | 不能點 |
| 已載入 | 照片 `object-cover` | — | 點了開全螢幕，從這張開始 |
| 失敗（等了 55 秒、網路錯誤、後端錯誤） | `bg-muted`＋`ImageOff` 24px＋「再試一次」 | 「照片沒載入，點一下再試一次。」 | 點格子＝重抓這一張 |
| 離線（沒網路、手機裡也沒有） | `bg-info-soft text-info-soft-foreground`＋`CloudOff`＋「需要連線」 | 「照片要連上網路才能看，連上後會自動載入。」 | 不能點；收到 `online` 事件後自動重抓 |
| 看不到（檔案不存在或不允許讀取） | `bg-muted`＋`ImageOff`＋「看不到」 | 「這張照片可能已經移走或刪除。」 | 不重試（重試也不會好）；Drive 連結照樣顯示 |
| 待上傳（還在手機裡） | 手機裡的照片＋左下角 `StatusBadge tone="info"`「待上傳」 | 「有照片還在手機裡，上線後會自動上傳。」 | 點了開全螢幕 |
| 後端還沒更新 | 不畫縮圖格 | `UpdateNeededNote`「需要更新 Apps Script 才能在 App 裡看照片。」 | 只剩 Drive 連結 |

- 幾張狀態不同時，說明行依「離線 → 失敗 → 看不到 → 載入中 → 待上傳」挑最前面的一行。
- 文案不出現 `forbidden`、`fileId`、`base64`、技術字或錯誤代碼。
- `alt`：「嘔吐・毛球的照片，第 1 張，共 3 張」（標題＋序號；我們不知道照片內容，不要亂描述）。佔位格用 `role="img"`＋同樣的 `aria-label` 再加狀態（「…第 2 張，沒載入」）。

**全螢幕照片檢視 `PhotoViewer`**

- **容器**：`Dialog`（焦點鎖在裡面、`Esc` 關閉、`aria-modal`）。`DialogContent` 改成滿版：`fixed inset-0 h-dvh w-full max-w-none translate-none rounded-none border-0 p-0`，加上 `dark` class（§3.4）→ 實心 `bg-background`（深色 `#1A1613`）、文字 `foreground`；不用半透明遮罩。`DialogTitle` 放 `sr-only`「嘔吐・毛球的照片」。
- **頂列**（實心底，`pt-[var(--safe-top)]`，內容高 56，`px-2`）：左邊 `Button variant="secondary" size="sm"`＋`X`＋文字「關閉」（44 高、一定有文字）；右邊 `font-num` 計數「1／3」（`aria-live="polite"`）；只有一張時不顯示計數。
- **圖片區**（剩下的高度）：`object-contain` 置中、`touch-action: none`，`alt` 同縮圖。
- **底列**（實心底，`pb-[var(--safe-bottom)]`，內容高 56）：超過一張時，左右各一顆 `Button variant="secondary" size="icon"`（`ChevronLeft`／`ChevronRight`，`aria-label`「上一張」「下一張」，到頭時 `disabled`）；中間灰字「點兩下放大・往下滑關閉」。
- **手勢**（換張和關閉只在 1 倍時有效；放大時單指只會平移）：
  - 雙指縮放 1–4 倍；點兩下在點的位置切換 1 倍 ↔ 2.5 倍；放大後可以平移，但不能拖出空白邊。
  - 1 倍時左右滑：位移超過畫面寬 25% 或快速撥動就換張，不然彈回。換張後縮放回到 1 倍。
  - 1 倍時往下滑：圖片跟著手指移動；放開時位移超過 120px 或快速撥動就關閉，不然彈回。
- **關閉**：「關閉」按鈕、往下滑、`Esc`。關閉後焦點回到打開它的縮圖。
- **還沒載入的那張**：中間放 `Skeleton`＋`WaitHint`（同縮圖文案）；失敗：「這張照片沒載入。」＋`Button variant="outline"`「再試一次」；離線：「照片要連上網路才能看。」；看不到：「看不到這張照片，可能已經移走或刪除。」（都是 16px、置中）。
- **減少動態**：換張、彈回、關閉都不做動畫（直接切換）；縮放與拖動仍然跟著手指（那是使用者自己在移動，不算動畫）。

### 7.5 紀錄頁：日期分組歷史＋篩選晶片

v1.1 起「7 天紀錄」改名「紀錄」（標題列與底部導覽），可以一直往前捲；首頁「看 7 天 ›」改成「看全部 ›」。

- **版面**：`ScreenLayout title="紀錄"`。篩選晶片列放在標題列區，跟標題一起固定、不跟著捲：`ScreenLayout` 新增 `toolbar` 插槽（`banner` 下方，`pb-2`）。捲動內容由上而下：灰字說明「點「撤銷」會劃掉，不會真的刪除，隨時可以復原。」→ 日期分組 → `ListEndState`。
- **篩選晶片 `FilterChips`**（`ChoiceMulti layout="scroll"`）：
  - 選項依序：全部、副食／零食、清砂、體重、驅蟲／疫苗／用藥、異常、居家維護。
  - 單行 `flex flex-nowrap overflow-x-auto`，左右貼齊螢幕（`-mx-4 px-4 scroll-px-4`），隱藏捲軸；晶片 `h-11`（44）`shrink-0 rounded-full px-4 whitespace-nowrap`，間距 8。
  - **複選**：點類型會加入或移除；選了任何類型，「全部」自動取消；最後一個類型被取消時回到「全部」；點「全部」會清掉其他選擇。預設「全部」。理由：規格要求可以多選，常見需求是「清砂＋異常」這種一起看；單選做不到。
  - 選中＝`accent` 底＋2px 主色外框＋粗體＋前面加 `Check` 圖示（16px，`aria-hidden`），不只靠顏色；ToggleGroup `type="multiple"` 已提供 `aria-pressed`。
  - 篩選只在手機上做，不重新向後端要資料。
  - 篩選、已載入的區間、捲動位置在這次開著 App 時保留（進詳情再返回，不重抓、不跳回頂端）。
- **日期標題 `DayHeader`**：`<h2>`，`sticky top-0 z-[5] -mx-4 bg-background px-4 py-2 font-bold text-muted-foreground`（實心底，不用透明）。文字：「今天」「昨天」，其他是「9 月 24 日（四）」；不是今年才加年份「2025 年 12 月 31 日（三）」。用台北時間的日曆日分組；篩選後沒有紀錄的日子不顯示標題。
  - 長格式只用在日期標題（捲很長的時候比 `9/24（四）` 好掃讀）；列內和其他地方仍用 §10 的短格式。新增 `fmtDayHeader()`，不要改 `fmtDayLabel()`。
- **列**：沿用 `TimelineItem`（時間｜emoji｜內容＋記錄人＋狀態；「編輯」「撤銷」／「復原」）。已撤銷的紀錄也顯示（才能復原）。每一天一個 `TimelineList`。
- **分頁**：第一頁就是首頁已經讀到的 7 天；之後每往下捲到底一次，就往前抓 30 天（`history`，一頁只發一個請求）。
- **`ListEndState`**（清單最後，一次只顯示一種）：

| 狀態 | 顯示 |
|---|---|
| 可以再載入 | `Button variant="outline" className="w-full"`「看更早的紀錄」，下一行灰字「目前看到 9/2（三）」。按鈕捲進畫面就自動觸發（`IntersectionObserver`，`rootMargin: "600px"`），也可以手動按。 |
| 載入中 | 3 條 `Skeleton h-16 rounded-lg`（`aria-hidden`），外層 `aria-busy="true"`；下方 `WaitHint`：約 5 秒「更早的紀錄要從 Google 試算表讀，第一次比較慢，最多約半分鐘。」約 20 秒「還在讀取，請稍等。」 |
| 沒有更多 | 置中灰字「沒有更早的紀錄了」，左右各一條 `Separator`；不加圖示、不加按鈕。 |
| 離線 | `Alert variant="info"`＋`CloudOff`：標題「需要連線才能看更早的紀錄」，內文「已經讀過的紀錄還是看得到；連上網路後再往下捲。」上線後，如果尾端在畫面裡就自動載入一次。 |
| 失敗 | `Alert variant="warning"`＋`TriangleAlert`：標題「讀不到更早的紀錄」，內文「可能是網路不穩，或 Google 暫時沒回應。」＋`Button variant="outline" size="sm"`「再試一次」（`RefreshCw`）。已經載入的紀錄全部保留；不自動重試。 |
| 後端還沒更新 | `UpdateNeededNote`「需要更新 Apps Script 才能看 7 天以前的紀錄。」 |

  - 一頁抓回來以後，如果**沒有新增任何符合篩選的列**，就不再自動觸發下一頁，改成顯示「看更早的紀錄」等使用者按（避免一口氣連打好幾個慢請求）。
- **篩選後沒有結果**：已載入的範圍裡沒有符合的紀錄時，說明行下方顯示置中灰字「9/2（三）以來沒有「體重」紀錄。」（多選時用「、」連接：「清砂、體重」）＋`Button variant="ghost" size="sm"`「看全部類型」；`ListEndState` 照常顯示在下面，讓使用者繼續往前找。
- **首頁資料還在讀**：5 條 `Skeleton h-16 rounded-lg`＋灰字「正在讀取最新紀錄⋯」（同首頁）。
- **減少動態**：不用平滑捲動；新載入的列直接出現（不淡入）；晶片按下不縮放；黏著標題本來就沒有動畫。

### 7.6 品項管理：往左滑封存＋「⋯」選單

- **入口**：副食／零食畫面「點一下就記錄」標題列右側 `Button variant="ghost" size="sm"`「管理品項 ›」，開子畫面 `#foods`（`ScreenLayout title="管理品項" onBack backLabel="副食／零食"`）。用子畫面不用 Sheet：清單可能很長，下面還有「已封存」區，而且 Sheet 的下滑關閉容易跟列的手勢混在一起。
- **使用中清單**：最上方灰字「封存的品項不會出現在選單裡，過去的紀錄不受影響。往左滑或點「⋯」都能封存。」；每列是 `ListRow`：前 emoji（類型）｜主體 名稱 `font-medium`＋灰字「副食罐・1 罐」，收藏的加 `Star`（`aria-label="收藏"`）｜尾 `RowMenu`。
- **往左滑 `SwipeRow`**：
  - 列的內容往左移，右邊露出 88px 寬的動作區：`bg-foreground text-background`（§3.4 中性反白）＋`Archive` 圖示 20px＋「封存」（16px 粗體），整塊是 `<button>`。
  - **顏色決定**：封存可以恢復，不是刪除，所以**不用 `destructive` 紅**（紅色在本系統代表緊急和不可逆）；也不用 `warning`／`success`／`info`（各自有狀態意義），不用主色（主色留給畫面上的主要動作）。中性反白在淺色、深色都有 14:1 以上的對比，跟 toast 是同一組顏色，看起來是「收起來」而不是「危險」。
  - 開始條件：水平位移超過 10px、而且大於直向位移（直向捲動優先）；列設 `touch-action: pan-y`、`select-none`。
  - 放開時：位移 ≥ 44px（動作區的一半）→ 停在打開狀態（露出 88px）；不到 → 彈回。打開後點「封存」→ 確認對話框。
  - 一路滑超過列寬 60%（full swipe）→ 直接開確認對話框，**不會不經確認就封存**；按取消後列彈回關閉。
  - 同時只開一列：打開另一列、往右滑、捲動清單、點列的其他地方都會關閉它。列打開時點主體只會關閉，不做別的事。
  - 放開後的定位動畫 200ms；減少動態時直接定位（拖動本身仍跟著手指）。
- **`RowMenu`（不用滑也能做到，必備）**：每列尾端 `Button variant="ghost" size="icon"`＋`Ellipsis`，`aria-label`「雞肉絲的更多動作」；`DropdownMenu` 項目（v1.1 只有一項）：「封存」（`Archive` 圖示，一般樣式，不用 destructive）。之後的動作（改名、收藏）也放在這裡。
- **確認對話框**（`ConfirmDialog confirmVariant="default"`）：
  - 標題：「封存『雞肉絲』？」
  - 內文：「之後不會出現在選單裡，過去的紀錄會保留。需要時可以在下方「已封存」恢復。」
  - 按鈕：左「取消」（outline，預設焦點）、右「封存」（主色）。
  - 理由：封存可以恢復，所以按鈕不用紅色；但它會改變兩個人共用的選單，所以仍然要確認（§8）。
- **封存後**：那一列移除（減少動態時直接消失），「已封存（N）」加一；toast「已封存：雞肉絲」＋「復原」（5 秒，復原＝把品項改回使用中）。離線照常（進佇列）。
- **已封存區**：清單最下面；N＝0 時不顯示。disclosure 按鈕（整列、高 ≥44、`aria-expanded`）「已封存（3）」＋`ChevronDown`，預設收起。展開後每列 `ListRow`：`bg-muted`、名稱 `text-muted-foreground`、灰字「已封存」，列尾 `Button variant="outline" size="sm"`「恢復」（`RotateCcw`，`aria-label`「恢復 雞肉絲」）。已封存的列不能滑。恢復不確認，toast「已恢復：雞肉絲」。
- **封存最後一個品項**：允許。管理清單顯示灰字「目前沒有使用中的品項。」＋`Button variant="outline"`「新增食物」；副食／零食畫面的「近期」分頁空白時顯示「還沒有品項，先新增一個吧。」，下面原本的「新增食物」按鈕一直都在，不會卡住。
- 品項選單、近期、收藏都不顯示已封存的品項；舊紀錄照樣顯示當時存下的名稱。

## 8. 互動

- **點擊回饋**：按下縮放 0.97、底色變 `accent`；不依賴 hover。減少動態時只保留顏色變化。
- **一鍵記錄**：點了就寫入，立刻顯示 Sonner toast「已記錄：…」＋「復原」，停留 **5 秒**（`--undo-window`）。復原＝軟刪除（`deleted=TRUE`），不真的刪列。
- **撤銷不限時**：時間軸（v0.5 起是可以一直往前捲的紀錄頁）裡每筆都能「撤銷」（劃掉）與「復原」，不需確認。
- **確認只給兩種動作**：①破壞性：清除密鑰／切換身分、未來的「永久刪除」，確認鈕用 destructive 紅；②**會改變兩人共用清單**：封存品項，確認鈕用主色（可以恢復，不是危險動作）。其他（包含撤銷、一鍵記錄週期項目、恢復封存）都不確認。
- **提醒型 Sheet**（例如重複餵食）：主要按鈕是較安全的選項，另一個選項用 outline。
- **記錄 vs. 設定**：記錄類畫面維持「點了就寫入＋復原」；**設定頁不即時生效**，改完按底部唯一的主要按鈕「儲存」→ toast「已儲存設定」。沒有變更（或欄位有錯）時按鈕停用並顯示「已儲存」。欄位即時驗證，錯誤訊息寫在欄位下方。
- **未儲存就離開**：設定頁有變更時按返回，跳 `UnsavedChangesSheet`（底部 Sheet）；沒有變更就直接返回，不問。
- **設定入口**：首頁標題列右上的身分膠囊（「我是 Brian ⚙」）。設定是低頻動作，不佔拇指區；拇指區留給記錄。
- **撥號**：電話一律用 `tel:` 連結；輸入框 `type="tel"`＋`inputMode="tel"`。緊急情境的撥號鈕只在有電話時出現。
- **手勢只是捷徑**：每個手勢都要有看得到的按鈕可以做到同一件事（§2）。手勢的觸發門檻寫在各元件規格裡（§7.4、§7.6），不要自訂。
- **清單分頁**：一頁只發一個請求；已經載入的保留，失敗也不清掉；失敗不自動重試，給「再試一次」；一頁沒帶來任何新的可見列時不自動抓下一頁（§7.5）。
- **後端版本不夠**：`read` 回傳的 `version` 小於 2（或沒有這個欄位）時，新功能（居家維護、App 內看照片、7 天以前的紀錄）在原本的位置放 `UpdateNeededNote`，不送出會失敗的請求，其他畫面照常。品項封存只用既有的 action，不受影響。
- **展開選填**：用 disclosure（`aria-expanded`），預設收起；展開不影響一鍵路徑。
- **動態時間**：120ms（按下）、200ms（淡入、滑動列放開後定位、照片彈回）、300ms（Sheet 滑入）；`prefers-reduced-motion` 時全部歸零（手指拖動中的跟隨不算動畫，照常）。
- **離線**：照常記錄，顯示「目前離線」橫幅與每筆「待上傳」；上線自動補送並 toast「已補送 N 筆」。送出失敗用紅色 toast＋「重試」，絕不默默遺失。
- **連線狀態要分清楚原因**（不要一律說「沒有網路」）：
  - 手機離線（`navigator.onLine=false`）：info 橫幅「手機目前沒有網路，連上 Wi‑Fi 或行動網路後再試一次。」
  - 手機有網路、但後端沒回應或回錯：warning 橫幅「網路正常，但連不到 Google 試算表。可能是網址設定有誤，或 Google 暫時沒回應。」＋「再試一次」。
  - 密鑰錯誤：另外的 destructive 訊息，請使用者重新輸入，不跟連線錯誤混在一起。
- **本機試用**（沒有設定後端網址時）：首次開啟跳過密鑰，只選身分；頂部固定顯示 muted 橫幅「本機試用・資料只存在這支手機」。只有這個模式會出現試用標示。
- **長等待要說明**：任何可能超過約 5 秒的等待（連線確認、上傳照片、補送多筆…），不能只放轉圈圖示。
  - 觸發的控制項（通常是底部主要按鈕）本身改成「確認中⋯」＋轉圈並停用；**正下方**加一行 muted 灰字（16px、置中、`aria-live="polite"`）。沒有按鈕的等待（照片載入、清單尾端載入），說明放在骨架正下方。
  - 約 **5 秒**：說明「為什麼慢、大概多久」，例如首次開啟「第一次連線 Google 比較慢，最多約半分鐘」。
  - 約 **20 秒**：換成安心的一句，請使用者不要離開，例如「還在連線，請不要關掉 App」。
  - 有結果（成功或任何錯誤）就立刻隱藏，秒數歸零；錯誤訊息照連線狀態規則另外顯示。
  - 轉圈動畫遵守 `prefers-reduced-motion`（tokens 已把動畫縮到 0，圖示會靜止）；說明文字才是主要資訊，不靠動畫傳達。
  - 實作：v0.5 起抽成共用的 `WaitHint`（§7.2），用在首次開啟、照片載入、更早的紀錄；Onboarding 改用它，文案不變。

## 9. 可近用性 checklist

- [ ] 文字對比 ≥4.5:1、非文字元件（邊線、焦點、紅點）≥3:1（淺色＋深色都要；用 `tools/tokens.py` 驗證）
- [ ] 所有文字 ≥16px；輸入框 ≥16px
- [ ] 點擊區 ≥44×44，相鄰間距 ≥8
- [ ] 狀態不只靠顏色：圖示＋文字；選中狀態另有外框／粗體／✓
- [ ] 焦點外框清楚可見（3px `--ring`，已蓋過 shadcn 的淡色 ring）
- [ ] 語意正確：按鈕用 `<button>`、單選用 radio（ToggleGroup single／`role="radiogroup"`）、複選用 Checkbox、`fieldset`＋`legend`
- [ ] 表單都有 `<Label>`；錯誤用 `aria-invalid`＋文字說明
- [ ] 動態訊息：toast（Sonner 內建 live region）、差值提示 `aria-live="polite"`、緊急提示 `role="alert"`
- [ ] 圖示若有意義要有 `aria-label`，裝飾性圖示 `aria-hidden`；emoji 當圖示時 `aria-hidden` 並有文字
- [ ] 圖表附文字摘要與列表
- [ ] 支援 `prefers-reduced-motion`、`prefers-color-scheme: dark`
- [ ] Safari 放大文字（網址列「aA」→ 文字大小）到 150% 時版面不破：不用固定高度裝文字、按鈕允許換行
- [ ] 返回鍵在每個子畫面左上角（standalone 沒有瀏覽器上一頁）
- [ ] 每個手勢（往左滑、雙指縮放、點兩下、往下滑關閉）都有看得到的按鈕可以做到
- [ ] 照片有 `alt`（標題＋第幾張）；載入中、失敗、離線、看不到都有文字，不只有圖示
- [ ] 全螢幕檢視：焦點鎖在裡面、`Esc` 可以關閉，關閉後焦點回到原本的縮圖
- [ ] 篩選晶片選中時有 ✓＋外框＋粗體，並有 `aria-pressed`
- [ ] 清單載入時外層 `aria-busy`，說明文字放在 `aria-live="polite"`；只有骨架不算完成

## 10. 語氣與文案

- **溫暖、簡短、口語**，像兩個人之間的便條；用「你」，不用「您」。一句話講一件事。
- **全形標點**：，。？！：「」（）；數字與中文間留半形空格。
- **時間**：24 小時制 `18:05`；日期 `9/24（四）`、跨年用 `2026/11/30`；相對時間 `剛剛`、`30 分鐘前`、`3 小時前`、`12 天前`；今天、昨天直接寫。
- **日期標題（只用在紀錄頁的分組標題）**：長格式「9 月 24 日（四）」；不是今年加年份「2025 年 12 月 31 日（三）」；今天、昨天直接寫（§7.5）。
- **封存不是刪除**：可以恢復的動作用「封存」「恢復」，不寫「刪除」「移除」。
- **照片與載入錯誤**：說發生什麼、能做什麼（「照片要連上網路才能看」「點一下再試一次」），不寫錯誤代碼或技術字。
- **數字差值**：`+0.08`、`−0.05`（全形減號較易讀）、單位前留空格 `3.42 kg`。
- **估計值不顯示比來源更精細的單位**：資料是估的，就加「約」並把精度降到來源的程度。例：生日是估計的（只知道大約哪個月）→ 年齡寫「約 10 個月」「約 1 歲 2 個月」，不寫「約 10 個月 25 天」；未滿 1 個月寫「未滿 1 個月」。確切生日才寫到天：「12 天」「10 個月 25 天」；滿 1 歲後一律只到月（「2 歲 3 個月」「1 歲」）。月數用日曆月計算（1/31 出生，2/28 滿 1 個月），不用 30 天一個月。
- **按鈕用動詞**：「記錄體重」「已給 滴劑 B」「標記已解決」；避免「確定」「送出」這種不明確的字。
- **緊急文案**：先說要做什麼，再說為什麼；不嚇人、不診斷。

| ✅ 這樣寫 | ❌ 不要這樣 |
|---|---|
| 已記錄：鮪魚肉泥 1 條［復原］ | 操作成功！資料已寫入資料庫。 |
| Mia 30 分鐘前給過零食，還要記錄嗎？ | 警告：偵測到重複的餵食事件。 |
| 請盡快聯絡獸醫 | 您的貓可能罹患尿道阻塞症！！ |
| 目前離線，連上網路後會自動補送。 | Network Error (503) |
| 還沒有紀錄。點下面的按鈕記下第一筆吧。 | 無資料 |
| 12 天前量 | 2026-09-14T21:00:00+08:00 |
| 18:05 的罐罐吃了多少？ | 請輸入剩食百分比 |
| 已逾期 2 天 | 逾期警告！維護未完成 |
| 照片要連上網路才能看，連上後會自動載入。 | 無法取得檔案（forbidden） |
| 沒有更早的紀錄了 | End of list |
| 封存『雞肉絲』？之後不會出現在選單裡，過去的紀錄會保留。 | 確定要刪除此項目嗎？此操作無法復原。 |

## 11. 示意資料規則

- Mockup／原型／截圖裡的**所有範例資料都是示意**，畫面上一定要看得到「示意資料」徽章（`SampleBadge`，虛線、`warning-soft`）。
- 產品名、品牌、數字加註「（示意）」；不要使用看起來像真實病歷、真實診所、真實電話的資料。
- 使用者名字用指定的顯示名稱（Brian、Mia）；其他個資一律不用。
- 原型的示意資料集中在 `mockup/src/fixtures/`，檔頭註明「示意」；正式 App 不得 import。
- 截圖交付時檔名或說明也要標「示意」。
- v0.5 的新元件還沒有做進原型；之後補原型或截圖時，照片一律用示意佔位圖（條紋底＋「示意照片」字樣），不放真實的貓咪或症狀照片。

## 12. 變更紀錄

- **v0.5（2026-10-09）**：配合 v1.1 規格（[`../spec/v1.1.md`](../spec/v1.1.md)），新增四組元件規格：§7.3 居家維護卡（不加第六顆大按鈕、列順序固定、不收合、設定頁間隔欄位）、§7.4 異常詳情頁＋全螢幕照片檢視（六種照片狀態、手勢與按鈕替代）、§7.5 日期分組歷史＋篩選晶片（複選、長格式日期標題、清單尾端狀態）、§7.6 往左滑封存＋「⋯」選單（中性反白、不用紅色、確認對話框用主色）。§3.2 新增全 App 統一的到期判斷（快到期門檻 3 天）；§3.4 中性反白與局部深色（不新增 token）；§7.1 新增 AlertDialog、DropdownMenu，Dialog 與 Skeleton 規則更新；§7.2 新增 `ListRow` 清單列結構、`DueStatus`、`RecurringItemRow`、`WaitHint`（從 Onboarding 抽出）、`UpdateNeededNote` 等，`ConfirmDialog` 新增 `confirmVariant`；§1、§8 確認規則擴充為「破壞性＋改變共用清單」；§2 新增手勢、sticky、`100dvh`、狀態列等 iOS 注意事項；§9、§10、§11 補對應條目。
- **v0.4（2026-09-26）**：§10 新增「估計值不顯示比來源更精細的單位」與年齡寫法（確切到天、估計只到月並加「約」、滿 1 歲只到月、日曆月）。設定頁新增「生日是估計的」Switch（改日期時自動關閉）。
- **v0.3（2026-09-26）**：§8 新增「長等待要說明」：超過約 5 秒的等待在觸發控制項下方顯示 muted 說明（5 秒說明原因與大約時間、20 秒改成請勿關閉 App 的安心文案），不能只有轉圈，結束即隱藏，轉圈遵守減少動態；範例為首次開啟的密鑰確認。
- **v0.2（2026-09-26）**：§8 補連線狀態分類（手機離線／連不到後端／密鑰錯誤）與「本機試用」模式；`NetworkBanner` 擴充為四種狀態。

- **v0.1（2026-09-26）**：新增 Switch（52×32，整列可點）、`FormSection`／`FormRow`（設定表單列）、`UnsavedChangesSheet`（未儲存提醒，用 Sheet 不用 Dialog）、`UrgentVetAlert` 撥號鈕規則（有電話才顯示、24 小時徽章）、`Stepper` 的 `step`／`editable`／`unit`；§8 補「記錄 vs. 設定」「未儲存就離開」「設定入口」「撥號」。
- **v0（2026-09-26）**：首版。暖米＋柿橘色票（淺／深色，全數通過 AA，程式驗證）；shadcn 變數命名＋Tailwind v4 `@theme inline`；16px 最小字級；44px 點擊區；iOS PWA 平台規則；狀態色正常／注意／緊急；元件清單（shadcn＋組合元件）；語氣與示意資料規則。
