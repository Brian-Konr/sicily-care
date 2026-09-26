# 主要決策與理由

v1 開發期間（2026-09-25 至 09-26，台北時間）做過的決定，以及當時的理由。之後要改其中任何一項，請先讀它的理由，確認前提已經不成立。

名詞：**Brian** 是 repo 擁有者，也是 Apps Script、Sheet、Drive 所在的 Google 帳號。**Mia** 是另一位使用者，文件中她的信箱一律寫成 `PARTNER_EMAIL`。**Chaewon** 是 Brian 的 AI 貓咪照護助理，它會讀 Sheet 和 Drive 的資料來做摘要和提醒，不是本 repo 的一部分。

## 架構

1. **後端用 Google Apps Script、Sheet 和 Drive，不架自己的伺服器。** 這樣不用付費，也不用維運。兩個人和 Chaewon 都能直接打開試算表查看或修改。代價是沒有即時推播，而且 Apps Script 冷啟動很慢。之後若要做即時同步或推播，升級路線是 Supabase（見 `pet-app-research.md`）。
2. **不用 GitHub JSON 當寫入端。** 那樣前端就得放 token，兩人同時寫入會有 SHA 衝突，而且每一筆紀錄都會變成一個 commit。
3. **前端是 Vite、React、TypeScript、Tailwind、shadcn/ui 加上 `vite-plugin-pwa`，放在 GitHub Pages。** 技術選型是 Brian 指定的。會選 GitHub Pages 而不是直接由 Apps Script 提供網頁，是因為 GitHub Pages 能正常「加入主畫面」安裝成 PWA。
4. **部署產物推到 `gh-pages` 分支（用 `scripts/deploy-gh-pages.sh`），不用 GitHub Actions。** 當時的 token 沒有 workflow 權限，也不能設 repo variable。`deploy/pages-workflow.yml` 是之後改用 Actions 時可以用的範本，目前沒有啟用。
5. **Apps Script 的 `/exec` 網址存在 `deploy/gas-url`，是公開的。** 真正的保護靠「共享密鑰」：每個人第一次開 App 時自己輸入，存在手機的 localStorage。**密鑰絕對不進 repo，前端也不放任何私密 token。**
6. **Sheet 和照片資料夾只分享給 Mia（PARTNER_EMAIL），不開「知道連結的人都能看」。**
7. **`appsscript.json` 的授權範圍縮小為 `spreadsheets.currentonly` 和 `drive`。** 最早的版本沒有 manifest，會要求所有試算表和完整 Drive 的權限。

## 可靠性（實際踩過的問題）

8. **所有請求最長等 55 秒（`GAS_TIMEOUT_MS`）。** Apps Script 閒置後第一次請求常常要 20 到 30 秒。原本寫入的逾時是 20 秒，導致寫入失敗；密鑰驗證曾經放寬到 45 秒，後來統一改成 55 秒。
9. **寫入必須冪等。** 每筆紀錄在前端先產生 `id`（食物是 `food_id`），後端遇到重複的 id 就略過。這樣逾時後重送也不會變成兩筆。
10. **離線佇列。** 送不出去的紀錄留在手機裡，連不上時每 20 秒自動重試，上線後補送，絕不默默遺失。
11. **連線狀態分三種：沒設定後端（本機試用）、手機離線、連不到 Google 後端。** 沒有後端網址時，首次開啟會跳過密鑰步驟。
12. **背景讀取失敗一次不顯示橫幅，15 秒後自動重讀，連續失敗 2 次才顯示。** 如果手機裡有待送紀錄，失敗一次就提示，讓使用者知道資料還在手機上。
13. **同時寫入用 `LockService` 包住，只 append 新列，不覆寫。** 刪除是軟刪除，寫 `deleted=TRUE`，不刪整列。

## 產品

14. **v1 是五顆按鈕：副食/零食、清砂、體重、驅蟲/疫苗/用藥、異常回報加照片。另外有首頁狀態、7 天時間軸和設定頁。** 每個常見情況都要一次點擊就能完成。乾飼料是任食，所以不記錄。
15. **貓砂是 pidan 三合一，會結塊，所以 `litter_clumping` 固定 TRUE。** 非凝結砂的畫面沒有做。
16. **提醒只在 App 內顯示。** 首頁會顯示下次驅蟲日期，體重逾期會出現紅點，另外由 Chaewon 讀資料後提醒。手機推播要另外的通知服務，排到 v2。
17. **初始資料：** 生日預設 2025-11-01（估計值）、第一筆體重 3.5 kg、食物預設 Hello Fresh 鯖魚（收藏）、Hello Fresh 鮪魚雞肉、雞肉絲。驅蟲和疫苗間隔預設體內 90 天、體外 30 天、疫苗 365 天，可以在設定頁修改。診所沒有填電話時，不顯示撥號按鈕。
18. **年齡顯示：** 確切生日顯示「X 個月 Y 天」，滿一歲後顯示「N 歲 X 個月」。估計的生日只顯示到月，前面加「約」，因為估計值不應該顯示比來源更精細的單位。這個旗標存在 Config 的 `birthday_estimated`。**不可以把 `birthday_estimated` 加進預設值**，否則重跑 Setup 時會補上一行 TRUE，把已經存過確切生日的使用者改回「約」。沒有這個 key 時，只有生日仍是預設的 2025-11-01 才會當成估計值。
19. **照片在前端先用 canvas 壓縮成長邊 1600px 的 JPEG。** 這一步也會把 HEIC 轉掉，並清除 EXIF 裡的 GPS 資訊，之後才以 base64 上傳到 Drive。

## v1 後的待辦（v2）

- 手機推播（需要通知服務）
- 食品資料庫、看診前摘要頁、照片 AI 判讀、記帳與庫存、多寵物
- 若 Apps Script 冷啟動仍然太慢，可以考慮定時暖機觸發器，或遷移到 Supabase
