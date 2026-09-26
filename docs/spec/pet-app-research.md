# 西西里共享照護紀錄 App：市場調查與產品分析

調查日期：2026-09-26（台北時間）｜使用情境：兩人同住、共養一隻 10 個月大的母小步舞曲貓；資料由 AI 助理 Chaewon 讀取

## 0. 市面 App 速覽（皆已查證確實存在）

| App | 重點功能 | 收費 | 值得注意 |
|---|---|---|---|
| 11pets | 疫苗/驅蟲自動排程、病歷、體重、美容、花費、多裝置同步 | 免費＋Premium 約 US$4.99/月 | Google Play 評論抱怨「升級」後資料沒轉好、買的終身方案功能縮水 |
| Kima | 共享時間軸、可指派任務、用藥、排泄紀錄、AI 洞察、PDF 看診報告、每週 email 摘要 | 免費最多 2 隻寵物；US$5.99/月（全家共用） | **跟我們的構想最像** |
| I Fed the Pet | 一鍵「已餵」、看得到誰餵的、推播、2 分鐘內可撤銷 | Pro US$4.99/月 | 30 天歷史紀錄要升 Pro 才有；只管餵食 |
| Fed? | 主畫面 widget 一鍵記錄、iCloud 同步、逾時提醒 | Pro US$1.99/月或買斷 US$39.99 | 只支援 iOS，Android 使用者不能用 |
| PetDesk | 跟診所系統串接：提醒、預約、續藥 | 飼主免費（由診所付費） | 要診所有導入才行，主要在北美 |
| Tractive | GPS 定位＋活動量追蹤 | 硬體＋訂閱（約 US$5–10/月） | 需要買項圈，家貓用不太到 |
| 毛孩指南 Furwise（台灣） | 貓咪專用：時間軸、疫苗/驅蟲/血檢提醒附文章出處、家人邀請共享、糞便/臉部照片 AI 觀察 | 免費 1 隻貓；Pro NT$220/月、NT$1,990/年 | 只有 iOS |
| PetView（台灣） | 疫苗/驅蟲/病歷存檔、提醒、照片 | 全部免費 | FAQ 寫紀錄「僅限帳號本人查看」，看起來不能共享 |
| 寵物筆記Family | 餵食/如廁勾選、家人即時同步、點兩下標「今天未進行」、體重圖、AI 健康檔案 | 免費＋內購 | 日本開發者，有繁中；只有 iPhone |
| 鏟屎官日記 | 大量紀錄類型（尿便、驅蟲、體重…）、記帳、庫存、共享帳號、社群 | 免費＋會員 | 功能非常多、很雜 |
| PetVerse（台灣上架） | AI 讀血檢報告、藥袋掃描、看診錄音轉筆記、社群、GPS 散步 | 免費＋Pro | 社群和散步功能偏狗、偏社交 |

## 0.5 幼貓值得追蹤的項目（輕量整理）
- **疫苗**：三合一從 6–8 週開始打，每 3–4 週補一劑打到 16 週以上，**6 月齡或 1 歲再補強一次**，之後室內貓約每 3 年一次。狂犬病疫苗：2025/7/1 起，完全室內飼養、外出會用提籠的家貓可以免強制施打（還是要看縣市公告和獸醫建議）。
- **驅蟲**：幼貓期密集，之後依生活環境每 1–3 個月一次（依獸醫建議）。
- **體重**：前 6 個月每 2–4 週量一次，之後每 1–3 個月一次；量太頻繁反而會被短期波動干擾。
- **排泄**：健康貓一天通常尿 2–4 次、大便 1–2 次；尿塊變大（多尿）或很多小塊、在砂盆用力都是警訊。
- **毛球/嘔吐**：嘔吐頻率比兩週一次還高，和腸胃疾病有關聯，不應該當成正常。
- **結紮**：建議在第一次發情前（約 4–7 個月）完成；如果還沒結紮，要盡快跟獸醫討論。

## A. 需要的（依重要性排序）
1. **一鍵記錄＋「誰、何時」**：餵食、清砂一點就記下，首頁直接顯示「上一餐：Mia 18:05」，避免重複餵食。這是每天會用到的核心。
2. **貓砂紀錄（尿塊數/大小、大便狀態）**：這是最便宜的健康指標，AI 才有辦法抓到異常。
3. **體重**：每 2–4 週量一次，畫成長曲線。
4. **驅蟲/疫苗/用藥＋提醒**：預載台灣的時程，打完一劑自動排下一次。
5. **看診紀錄**：日期、診所、醫囑、照片。
6. **嘔吐/毛球/異常備註**：附照片。

## B. 不需要的
- **社群動態/論壇**（PetVerse、鏟屎官日記）：兩人用不到，只是噪音。
- **商城、優惠券**：跟照顧無關。
- **多寵物/多家戶/保母模式**（Kima、I Fed the Pet）：只有一隻貓，多一層選單反而拖慢一鍵記錄。
- **GPS 項圈、散步路線**（Tractive、PetVerse）：室內貓，還要買硬體加訂閱。
- **診所預約/病歷串接**（PetDesk）：台灣診所多半沒有導入。
- **App 內建 AI 聊天**：已經有 Chaewon，不需要再付一次 AI 訂閱。
- **記帳/庫存**：v1 先不做，想看可以問 Chaewon。

## C. 市面沒有、但我們可以做得更好的
1. **防重複餵食確認**：兩小時內再按「餵食」會跳出「Mia 15 分鐘前已餵」。寵物筆記Family、I Fed the Pet 只做到同步顯示。
2. **Chaewon 讀資料**：用自然語言回答（例如「這週尿塊比平常少嗎？」），並做異常提醒，像是 24 小時沒有尿塊紀錄、食量掉 30%。Kima、Furwise 有 AI 摘要，但要訂閱，也鎖在 App 裡。
3. **看診前一頁摘要**：Chaewon 整理近 14 天的食量、排泄、體重、嘔吐給獸醫看。Kima 有 PDF 報告，是付費功能。
4. **台灣時程＋繁中＋iOS/Android 都能用的 PWA**：Furwise 有台灣時程但只有 iOS，要訂閱。
5. **拍照記錄**：拍砂盆或飯碗，由 Chaewon 估尿塊大小、剩食量（只是輔助，不是診斷）。
6. **資料自己擁有，不用訂閱**：避免 11pets 那種「升級」後資料不見的問題。

## MVP（v1，一個週末）
1. PWA 首頁 5 顆大按鈕：餵食、清砂（尿塊數＋大便正常/軟/無）、體重、驅蟲/用藥、備註＋照片
2. 登入身分（兩人），自動帶入記錄者和時間
3. 首頁顯示「上次餵食/清砂是誰、幾點」＋重複餵食警告
4. 最近 7 天時間軸，可以撤銷、編輯
5. 預載驅蟲/疫苗下次日期
6. 資料寫進儲存層，給 Chaewon 讀；Chaewon 每天做摘要、發異常提醒

**v2**：推播提醒、看診摘要頁、照片 AI 判讀、體重成長曲線、食量換算（公克）、飼料/貓砂庫存提醒、看診紀錄表單。

## 儲存建議
**v1 建議用 Google Sheet＋Apps Script Web App**：PWA 呼叫 Apps Script 一次新增一列（append-only），不用自己架伺服器，免費；兩人都能直接打開試算表看或修改，Chaewon 透過 Google Drive/Sheets 就能讀。缺點是沒有即時推播（打開 App 時重新抓資料就夠用來防重複餵食），延遲約 1–2 秒，權限要靠 Apps Script 的網址和簡單密鑰來控管。**GitHub JSON 不建議當寫入端**：前端要放 token，兩人同時寫會發生 SHA 衝突，每次記錄都變成一個 commit，不過拿來當 Chaewon 讀的每日備份很適合。**Supabase** 是升級路線：Postgres、即時訂閱、Row Level Security、免費額度也夠用，要做真正的即時同步和推播時再遷移；Firebase 同理，但 NoSQL 對 AI 做趨勢查詢比較不方便。

## 資料來源
- 11pets 功能：https://www.11pets.com/en/feature ｜ 家人共享/付費：https://www.11pets.com/en/home ｜ Google Play 評論：https://play.google.com/store/apps/details?id=com.m11pets.elevenpets&hl=en
- 11pets 價格比較：https://www.petiogo.com/blog/best-pet-care-apps-2026 ；https://petnexa.app/en/blog/best-pet-health-apps-guide-2026
- Kima：https://www.getkima.com/
- I Fed the Pet：https://apps.apple.com/tm/app/i-fed-the-pet-feed-tracker/id6762333960
- Fed?：https://apps.apple.com/us/app/fed-pet-feeding-tracker-log/id6760776848
- PetDesk：https://petdesk.com/frequently-asked-questions ；https://www.capterra.ca/software/166086/petdesk
- Tractive 方案：https://tractive.com/en/c/plans
- 毛孩指南 Furwise：https://furwise.app/zh/
- PetView：https://www.petview.app/pet-profile/ ；https://www.petview.app/petview-app-health-tracker-guide/
- 寵物筆記Family：https://apps.apple.com/hk/app/id6745396420
- 鏟屎官日記：https://apps.apple.com/mo/app/id1599108594
- PetVerse：https://apps.apple.com/tw/app/petverse/id6762284011
- 貓三合一疫苗時程（豆皮動物醫院）：https://peace-vet.com/feline-core-vaccination/
- 疫苗/狂犬病法規：https://health.businessweekly.com.tw/article/ARTL003015957 ；https://emilyntu.com/post/595/
- 室內貓免打狂犬病新制（嘉義市）：https://ccap.chiayi.gov.tw/News_Content.aspx?n=8591&s=856210
- 幼貓驅蟲時程（貓舍文章，僅供參考）：https://www.s1130025.com/news/details.php?group_id=9222&id=40863
- 幼貓體重測量頻率（Royal Canin 台灣）：https://www.royalcanin.com/tw/cats/kitten/kitten-growth-chart
- 結紮時機（獸醫 Emily）：https://emilyntu.com/post/3990/
- 砂盆健康訊號：https://www.vetstreet.com/home-and-cleaning/litter-boxes/things-your-cats-litter-box-can-reveal-about-their-health ；https://www.petmd.com/cat/symptoms/why-is-my-cat-peeing-a-lot ；iCatCare 2025 指引 https://pmc.ncbi.nlm.nih.gov/articles/PMC11816079/
- 毛球/嘔吐頻率：https://www.canadianveterinarians.net/media/dojiquvt/hairballs-are-not-normal.pdf
