# 對比報告（docs/design/tools/tokens.py 自動產生）

WCAG 2.x 相對亮度公式；文字門檻 4.5:1（AA），非文字 3:1。

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
