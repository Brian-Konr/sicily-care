# 設計系統 v0.4（DESIGN.md）

> **這是「西西里共同照護紀錄」PWA 的設計系統**：色彩、字體、間距、圓角、元件、互動、可近用性與語氣都寫在這裡。
> 規則以本文件為準；**實作以 App 程式碼（repo 根目錄的 `src/`）為正本**——文件和程式不一致時，先看程式碼，再回頭更新本文件。
> 可點原型 `mockup/` 只是設計參考，可能落後於 App，見 [mockup/README.md「原型只是設計參考」](./mockup/README.md#原型只是設計參考app-程式碼才是正本)。

版本：v0.4｜2026-09-26（台北時間）
適用：西西里共同照護紀錄 PWA（使用者 Brian、Mia）。需求與規劃見 [`../spec/plan.md`](../spec/plan.md)、[`../spec/logging-spec.md`](../spec/logging-spec.md)、[`../spec/decisions.md`](../spec/decisions.md)。
技術基準：Vite＋React＋TypeScript＋Tailwind CSS v4＋shadcn/ui（style new-york、base color neutral、CSS variables）。

- **Tokens 檔**：[`design-tokens.css`](./design-tokens.css)（沿用 shadcn 變數命名，含 Tailwind v4 `@theme inline`）。App 建置前 `scripts/sync-tokens.mjs` 會把它複製到 `src/styles/design-tokens.css`，所以不要直接改 `src/styles/` 那份；檔名與位置請保持不變。
- **Tokens 來源＋對比計算**：[`tools/tokens.py`](./tools/tokens.py)（改色只改這裡；`python3 docs/design/tools/tokens.py` 會重寫 CSS 並重算對比，有任何一組不過就 exit 1）
- **對比報告**：[`tools/contrast-report.md`](./tools/contrast-report.md)
- **可點原型**：[`mockup/`](./mockup/)（設計參考，元件照本文件；截圖在 `mockup/screens/`）
- **歷史交接紀錄**：[`handoff/`](./handoff/)（當時從原型搬到 App 的接線 diff，只供參考）

---

## 1. 設計原則

1. **一次點擊完成常見情況**：每天做的事（餵、清砂、補填吃了多少）一點就記好；細節放在「展開」裡，選填。
2. **先記再改，不先問**：一般紀錄不跳確認，靠「復原」toast 和時間軸的「撤銷」補救；只有破壞性動作才確認。
3. **簡潔溫暖**：暖米色底、柿橘主色、圓角、口語短句。畫面上一次只強調一件事。
4. **狀態一眼看懂，但不只靠顏色**：正常／注意／緊急一律「圖示＋文字＋顏色」。
5. **拇指優先**：主要按鈕放在畫面下半部（底部按鈕列、大按鈕磚），點擊區至少 44×44。
6. **誠實呈現資料狀態**：待填、待上傳、沒送出、示意資料，都要看得出來。

## 2. 平台（iPhone／iOS Safari PWA）

兩位使用者都用 iPhone，所以以 **iOS Safari 加到主畫面（standalone）** 為主要環境：

- **安全區**：`<meta name="viewport" content="…, viewport-fit=cover">`；tokens 提供 `--safe-top: env(safe-area-inset-top)`、`--safe-bottom: env(safe-area-inset-bottom)`。標題列加 `padding-top: var(--safe-top)`（避開瀏海／動態島），底部導覽與按鈕列加 `padding-bottom: var(--safe-bottom)`（避開 Home 指示條）。原型外框用 47px／34px 模擬。
- **拇指區**：子畫面的主要動作放在固定底部的 `BottomActionBar`；首頁大按鈕在畫面中下段；底部導覽只放 2 個目的地。
- **底部 Sheet 取代置中對話框**：選項、提醒、編輯都用 `Sheet side="bottom"`；置中 `Dialog` 只給破壞性確認（同 iOS 的警告框）。
- **不靠 hover**：所有回饋用 `:active`（按下縮到 0.97）與選中狀態；元件已移除 hover-only 樣式。
- **輸入框 ≥16px**：小於 16px iOS 會自動放大畫面。tokens 把 `text-xs`／`text-sm` 也設成 16px，`input, textarea, select` 另設 `font-size: max(16px, 1em)`。
- **數字鍵盤**：體重等小數用 `inputMode="decimal"`；整數用 `inputMode="numeric"`；不要用 `type="number"`（iOS 上有捲動改值與格式問題）。
- **Sheet 開啟時不自動聚焦輸入框**（避免鍵盤突然彈出）：`onOpenAutoFocus={e => e.preventDefault()}`；只有按鈕可以自動聚焦。
- **加到主畫面提示**：首次開啟畫面放簡短步驟（Safari「分享」→「加入主畫面」）。只在 iOS Safari 且非 standalone 時顯示。
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
| 注意 | `warning`（淺底 `warning-soft`） | `TriangleAlert` | 重複餵食提醒、軟便、快到期 |
| 緊急 | `destructive`（實心） | `OctagonAlert`／`Siren` | 「請盡快聯絡獸醫」、逾期紅點 |
| 資訊（補充） | `info` | `Eye`／`CloudOff` | 嚴重度「觀察」、離線 |

規則：狀態一定同時有**圖示＋文字**；紅點旁一定有文字（例如「● 已經 16 天沒量了」）。

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
| **Sonner（toast）** | 記錄成功的回饋，含「復原」動作。深色底（`foreground`）淺色字；動作按鈕 44 高。位置：底部導覽／按鈕列上方。同時最多 1 則。z-index 在 Sheet 遮罩之下。 |
| **Alert** | 變體：`info`（離線）、`warning`、`success`、`destructive`（讀取失敗）、`urgent`（實心紅：請盡快聯絡獸醫）。 |
| **Dialog** | **只用於破壞性確認**（例如「清除這支手機的密鑰」）。其他情況一律用 Sheet。 |
| **Switch** | 開／關設定（例如「24 小時營業」）。52×32、拇指 26px；`::after` 把點擊區外擴到 64×44。一定放在 `FormRow` 裡、以 `htmlFor` 綁標籤：標籤撐滿整列左側，所以**整列都能點**。開啟＝主色底＋拇指靠右（不只靠顏色）。在設定頁裡它跟其他欄位一起等「儲存」，不即時生效。 |
| Label、Separator、Skeleton | 表單標籤、分隔、載入骨架。 |

另外：`PortalContainerContext`（`ui/portal-context.tsx`）讓 Sheet／Dialog 掛進指定容器；正式 App 不需要設定。

### 7.2 組合元件（composites）

| 元件 | 說明 |
|---|---|
| `ScreenLayout` | 畫面骨架：安全區、標題列（返回鍵＋標題＋示意徽章）、橫幅、可捲內容、底部拇指區。 |
| `BottomActionBar` | 子畫面固定底部的主要按鈕列。 |
| `BottomNav` | 底部導覽（最多 2–4 個目的地；目前「首頁／7 天紀錄」）。 |
| `ActionTile`（大按鈕磚） | 首頁 2 欄大按鈕，emoji＋標題＋提示；`primary` 橫跨兩欄給最常用動作；可帶紅點＋文字。 |
| `LastActivityCard` | 「上次餵食：Mia 18:05｜30 分鐘前」。 |
| `PendingEatenCard`（待填卡） | 虛線主色外框＝還沒完成；內含 `EatenPicker`，點一下就完成。 |
| `EatenPicker` | 5 選 1：全吃完／吃大半／一半／一點點／沒吃（圓餅圖示＋文字）。 |
| `Stepper`（± 調整器） | 兩顆 44×44 按鈕夾數字；到上下限時停用。大數字用 `step`（例如間隔天數每按一次 ±15／±30）＋`editable`（中間是可直接輸入的數字框，`inputMode="numeric"`，輸入值夾在上下限內）＋`unit`（「天」）。 |
| `LitterQuickRow` | 「尿塊 [− 2 +]・便 [− 1 +]＋一切正常 ✓」一鍵列。 |
| `ChoiceSingle`／`ChoiceMulti` | ToggleGroup 包裝的晶片組（wrap／grid／list 版面）。 |
| `CheckList` | Checkbox 複選清單，可標重點選項。 |
| `SummaryCard`＋`OverdueDot` | 可點的摘要卡（體重、下次驅蟲）；逾期紅點＋文字。 |
| `StatusBadge` | 正常／注意／緊急等狀態徽章（圖示＋文字）。 |
| `TimelineItem`／`TimelineList` | 時間｜圖示｜內容＋記錄人＋狀態；撤銷後刪除線＋「已撤銷」＋「復原」。另顯示「待上傳」「沒送出」。 |
| `DuplicateWarningSheet` | 「Mia 30 分鐘前給過零食，還要記錄嗎？」主要按鈕＝安全選項「不用了，不記錄」。 |
| `UrgentVetAlert`（紅色緊急橫幅） | 實心紅底、警笛圖示、粗體「請盡快聯絡獸醫」＋一句原因與行動；`role="alert"`。**有診所電話時**多一顆滿版撥號鈕：反白（紅底上的白底紅字）、56 高、電話圖示＋「打給 {診所名}」，是 `<a href="tel:…">`；下面一行電話號碼＋（24 小時營業時）外框「24 小時」徽章。**沒有電話時不顯示按鈕**，只有一句不可點的提示「之後可以到「設定」填診所電話…」（緊急時不把人帶離表單）。 |
| `NetworkBanner` | 四種狀態：手機離線（info）／連不到後端（warning＋「再試一次」）／沒送出（destructive＋重新送出）／本機試用（muted，固定頂部）。 |
| `PhotoSlots` | 最多 3 張照片格，縮圖右上 44px 移除鈕。 |
| `WeightChart` | 純 SVG 折線圖，附文字摘要（`aria-label`）。 |
| `EditEntrySheet` | 編輯一筆紀錄（時間、備註＋類型欄位）。 |
| `ConfirmDialog` | 破壞性確認（Dialog）。 |
| `FormSection`／`FormRow`（設定表單列） | iOS「設定」風格：小標題（可帶右側徽章，如「選填」「示意預設」）＋一張卡片、列與列之間分隔線＋卡片下方說明。`FormRow` 兩種版面：inline（左標籤、右控制項，列高 ≥56，用於 Switch／Stepper／按鈕）與 `stack`（標籤在上、輸入框滿版，用於文字／電話／日期）。每列可帶 `hint`（灰字）或 `error`（紅字、`role="alert"`，取代 hint）。 |
| `UnsavedChangesSheet`（未儲存提醒） | 有未儲存變更時按返回 → 底部 Sheet（**不用 Dialog**，離開不會毀掉紀錄）：標題「還沒儲存，要離開嗎？」；按鈕由上而下「儲存後離開」（主要；欄位有錯時隱藏）、「不儲存，直接離開」（outline＋紅字）、「繼續編輯」（ghost）。點遮罩／下滑＝繼續編輯。 |
| `SampleBadge` | 「示意資料」虛線徽章。 |

## 8. 互動

- **點擊回饋**：按下縮放 0.97、底色變 `accent`；不依賴 hover。減少動態時只保留顏色變化。
- **一鍵記錄**：點了就寫入，立刻顯示 Sonner toast「已記錄：…」＋「復原」，停留 **5 秒**（`--undo-window`）。復原＝軟刪除（`deleted=TRUE`），不真的刪列。
- **撤銷不限時**：7 天時間軸裡每筆都能「撤銷」（劃掉）與「復原」，不需確認。
- **確認只給破壞性動作**：清除密鑰／切換身分、未來的「永久刪除」。其他（包含撤銷）都不確認。
- **提醒型 Sheet**（例如重複餵食）：主要按鈕是較安全的選項，另一個選項用 outline。
- **記錄 vs. 設定**：記錄類畫面維持「點了就寫入＋復原」；**設定頁不即時生效**，改完按底部唯一的主要按鈕「儲存」→ toast「已儲存設定」。沒有變更（或欄位有錯）時按鈕停用並顯示「已儲存」。欄位即時驗證，錯誤訊息寫在欄位下方。
- **未儲存就離開**：設定頁有變更時按返回，跳 `UnsavedChangesSheet`（底部 Sheet）；沒有變更就直接返回，不問。
- **設定入口**：首頁標題列右上的身分膠囊（「我是 Brian ⚙」）。設定是低頻動作，不佔拇指區；拇指區留給記錄。
- **撥號**：電話一律用 `tel:` 連結；輸入框 `type="tel"`＋`inputMode="tel"`。緊急情境的撥號鈕只在有電話時出現。
- **展開選填**：用 disclosure（`aria-expanded`），預設收起；展開不影響一鍵路徑。
- **動態時間**：120ms（按下）、200ms（淡入）、300ms（Sheet 滑入）；`prefers-reduced-motion` 時全部歸零。
- **離線**：照常記錄，顯示「目前離線」橫幅與每筆「待上傳」；上線自動補送並 toast「已補送 N 筆」。送出失敗用紅色 toast＋「重試」，絕不默默遺失。
- **連線狀態要分清楚原因**（不要一律說「沒有網路」）：
  - 手機離線（`navigator.onLine=false`）：info 橫幅「手機目前沒有網路，連上 Wi‑Fi 或行動網路後再試一次。」
  - 手機有網路、但後端沒回應或回錯：warning 橫幅「網路正常，但連不到 Google 試算表。可能是網址設定有誤，或 Google 暫時沒回應。」＋「再試一次」。
  - 密鑰錯誤：另外的 destructive 訊息，請使用者重新輸入，不跟連線錯誤混在一起。
- **本機試用**（沒有設定後端網址時）：首次開啟跳過密鑰，只選身分；頂部固定顯示 muted 橫幅「本機試用・資料只存在這支手機」。只有這個模式會出現試用標示。
- **長等待要說明**：任何可能超過約 5 秒的等待（連線確認、上傳照片、補送多筆…），不能只放轉圈圖示。
  - 觸發的控制項（通常是底部主要按鈕）本身改成「確認中⋯」＋轉圈並停用；**正下方**加一行 muted 灰字（16px、置中、`aria-live="polite"`）。
  - 約 **5 秒**：說明「為什麼慢、大概多久」，例如首次開啟「第一次連線 Google 比較慢，最多約半分鐘」。
  - 約 **20 秒**：換成安心的一句，請使用者不要離開，例如「還在連線，請不要關掉 App」。
  - 有結果（成功或任何錯誤）就立刻隱藏，秒數歸零；錯誤訊息照連線狀態規則另外顯示。
  - 轉圈動畫遵守 `prefers-reduced-motion`（tokens 已把動畫縮到 0，圖示會靜止）；說明文字才是主要資訊，不靠動畫傳達。
  - 實作：目前寫在畫面內（`Onboarding.tsx` 的 `useWaitSeconds(busy)`＋兩段文案），還沒抽成共用元件；第二個畫面需要時再抽 `WaitHint`。

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

## 10. 語氣與文案

- **溫暖、簡短、口語**，像兩個人之間的便條；用「你」，不用「您」。一句話講一件事。
- **全形標點**：，。？！：「」（）；數字與中文間留半形空格。
- **時間**：24 小時制 `18:05`；日期 `9/24（四）`、跨年用 `2026/11/30`；相對時間 `剛剛`、`30 分鐘前`、`3 小時前`、`12 天前`；今天、昨天直接寫。
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

## 11. 示意資料規則

- Mockup／原型／截圖裡的**所有範例資料都是示意**，畫面上一定要看得到「示意資料」徽章（`SampleBadge`，虛線、`warning-soft`）。
- 產品名、品牌、數字加註「（示意）」；不要使用看起來像真實病歷、真實診所、真實電話的資料。
- 使用者名字用指定的顯示名稱（Brian、Mia）；其他個資一律不用。
- 原型的示意資料集中在 `mockup/src/fixtures/`，檔頭註明「示意」；正式 App 不得 import。
- 截圖交付時檔名或說明也要標「示意」。

## 12. 變更紀錄

- **v0.4（2026-09-26）**：§10 新增「估計值不顯示比來源更精細的單位」與年齡寫法（確切到天、估計只到月並加「約」、滿 1 歲只到月、日曆月）。設定頁新增「生日是估計的」Switch（改日期時自動關閉）。
- **v0.3（2026-09-26）**：§8 新增「長等待要說明」：超過約 5 秒的等待在觸發控制項下方顯示 muted 說明（5 秒說明原因與大約時間、20 秒改成請勿關閉 App 的安心文案），不能只有轉圈，結束即隱藏，轉圈遵守減少動態；範例為首次開啟的密鑰確認。
- **v0.2（2026-09-26）**：§8 補連線狀態分類（手機離線／連不到後端／密鑰錯誤）與「本機試用」模式；`NetworkBanner` 擴充為四種狀態。

- **v0.1（2026-09-26）**：新增 Switch（52×32，整列可點）、`FormSection`／`FormRow`（設定表單列）、`UnsavedChangesSheet`（未儲存提醒，用 Sheet 不用 Dialog）、`UrgentVetAlert` 撥號鈕規則（有電話才顯示、24 小時徽章）、`Stepper` 的 `step`／`editable`／`unit`；§8 補「記錄 vs. 設定」「未儲存就離開」「設定入口」「撥號」。
- **v0（2026-09-26）**：首版。暖米＋柿橘色票（淺／深色，全數通過 AA，程式驗證）；shadcn 變數命名＋Tailwind v4 `@theme inline`；16px 最小字級；44px 點擊區；iOS PWA 平台規則；狀態色正常／注意／緊急；元件清單（shadcn＋組合元件）；語氣與示意資料規則。
