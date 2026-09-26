"""截圖：390×844、deviceScaleFactor 2，寫到 docs/design/mockup/screens/。
先在 docs/design/mockup 執行 `npm run build && npm run preview`（預設 http://localhost:4173）。
用法：python scripts/screenshots.py [base_url]
  或用環境變數：PREVIEW_URL=http://localhost:5000/、PREVIEW_PORT=5000
需要：Python venv 裡 `pip install playwright` 並 `playwright install chromium`。
  想用系統 Chrome／Chromium 時設 CHROME_PATH=/path/to/chrome。
"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright

PORT = os.environ.get("PREVIEW_PORT", "4173")
BASE = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("PREVIEW_URL", f"http://localhost:{PORT}/")
if not BASE.endswith("/"):
    BASE += "/"
OUT = pathlib.Path(__file__).resolve().parent.parent / "screens"  # 以這個檔案的位置為準
OUT.mkdir(exist_ok=True)
CHROME = os.environ.get("CHROME_PATH")  # 沒設就用 Playwright 內建的 Chromium

def run():
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME or None, args=["--lang=zh-TW"])
        def page(scheme="light", reduced=False, full=False):
            ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                color_scheme=scheme, reduced_motion="reduce" if reduced else "no-preference",
                                locale="zh-TW", timezone_id="Asia/Taipei")
            return ctx.new_page()
        def go(pg, hash_, q=""):
            pg.goto("about:blank")  # 強制重新載入，示意資料回到初始狀態
            pg.goto(f"{BASE}?shot{q}#{hash_}")
            pg.wait_for_selector(".phone-frame")
            pg.wait_for_timeout(400)
        def snap(pg, name, full=False):
            el = pg.locator(".phone-frame")
            el.screenshot(path=str(OUT / f"{name}.png"), animations="disabled")
            print("saved", name)

        # 1 首頁
        pg = page(reduced=True); go(pg, "home"); snap(pg, "01-home")
        go(pg, "home", "&full"); snap(pg, "01-home-full")
        pd = page("dark", reduced=True); go(pd, "home"); snap(pd, "01-home-dark")
        go(pd, "home", "&full"); snap(pd, "01-home-dark-full")
        go(pg, "home", "&offline"); snap(pg, "01b-home-offline")
        go(pg, "home", "&exactbd"); snap(pg, "01h-home-exact-age")
        go(pg, "home", "&unreachable"); snap(pg, "01f-home-unreachable")
        go(pg, "home", "&trial"); snap(pg, "01g-home-local-trial")
        go(pg, "home", "&home=loading"); snap(pg, "01c-home-loading")
        go(pg, "home", "&home=empty"); snap(pg, "01d-home-empty")
        # 首頁一鍵：清砂一切正常 → toast 復原
        go(pg, "home"); pg.get_by_role("button", name="一切正常").click(); pg.wait_for_timeout(300); snap(pg, "01e-home-litter-toast")

        # 2 副食／零食
        go(pg, "feed"); snap(pg, "02-feed")
        pg.get_by_role("button", name="雞肉絲").first.click(); pg.wait_for_timeout(300); snap(pg, "02b-feed-logged-toast")
        pg.get_by_role("button", name="展開選填").click(); pg.get_by_role("radio", name="喜歡").click()
        pg.wait_for_timeout(200); snap(pg, "02c-feed-expanded")
        go(pg, "feed"); pg.get_by_role("button", name="Hello Fresh 鮪魚雞肉").first.click(); pg.wait_for_timeout(500); snap(pg, "02d-feed-duplicate-sheet")
        go(pg, "feed", "&full"); snap(pg, "02-feed-full")

        # 3 清砂
        go(pg, "litter"); snap(pg, "03-litter")
        pg.get_by_role("button", name="有異常").click()
        for _ in range(2): pg.get_by_role("button", name="尿塊減一").click()
        pg.get_by_text("蹲很久/用力").click(); pg.wait_for_timeout(200)
        pg.get_by_role("alert").filter(has_text="請盡快聯絡獸醫").scroll_into_view_if_needed(); pg.wait_for_timeout(200)
        snap(pg, "03b-litter-urgent-vet")
        go(pg, "litter", "&clinic"); pg.get_by_role("button", name="有異常").click()
        for _ in range(2): pg.get_by_role("button", name="尿塊減一").click()
        pg.get_by_text("蹲很久/用力").click(); pg.wait_for_timeout(200)
        pg.get_by_role("alert").filter(has_text="請盡快聯絡獸醫").scroll_into_view_if_needed(); pg.wait_for_timeout(200)
        snap(pg, "03c-litter-urgent-vet-call")

        # 4 體重
        go(pg, "weight"); pg.get_by_label("體重（公斤）").fill("3.48"); snap(pg, "04-weight")
        go(pg, "weight", "&overdue"); snap(pg, "04b-weight-overdue")
        go(pg, "weight", "&full"); snap(pg, "04-weight-full")

        # 5 驅蟲／疫苗／用藥
        go(pg, "med"); snap(pg, "05-med")
        pg.get_by_role("button", name="其他類型或修改內容").click(); pg.get_by_role("radio", name="體內驅蟲").click()
        pg.get_by_label("下次日期").scroll_into_view_if_needed(); pg.wait_for_timeout(200); snap(pg, "05b-med-expanded")

        # 6 異常回報
        go(pg, "issue"); snap(pg, "06-issue")
        pg.get_by_role("radio", name="嘔吐").click(); pg.get_by_role("radio", name="毛球").click()
        pg.get_by_role("radio", name="要注意").click()
        pg.get_by_role("button", name="加照片").click(); pg.get_by_role("button", name="加照片").click(); pg.get_by_role("button", name="加照片").click()
        pg.get_by_text("已達上限").scroll_into_view_if_needed(); pg.wait_for_timeout(200); snap(pg, "06b-issue-filled")

        # 7 時間軸
        go(pg, "timeline"); snap(pg, "07-timeline")
        pg.get_by_role("button", name="撤銷").first.click(); pg.wait_for_timeout(300); snap(pg, "07b-timeline-undone")
        pg.get_by_role("button", name="編輯").first.click(); pg.wait_for_timeout(500); snap(pg, "07c-timeline-edit-sheet")

        # 8 首次開啟
        go(pg, "onboarding"); snap(pg, "08-onboarding")
        pg.get_by_role("radio", name="我是 Mia").click(); pg.get_by_placeholder("兩人用同一組").fill("wrong")
        pg.get_by_role("button", name="開始使用").click(); pg.wait_for_timeout(1000); snap(pg, "08b-onboarding-bad-secret")
        go(pg, "onboarding", "&full"); snap(pg, "08-onboarding-full")
        go(pg, "onboarding", "&trial"); pg.get_by_role("radio", name="我是 Brian").click(); pg.wait_for_timeout(200)
        snap(pg, "08c-onboarding-local-trial")
        # 長等待提示：假時鐘快轉（不用真的等 25 秒）
        pw = page(); pw.clock.install()
        go(pw, "onboarding", "&slow"); pw.get_by_role("radio", name="我是 Mia").click()
        pw.get_by_placeholder("兩人用同一組").fill("sicily-demo"); pw.evaluate("document.activeElement.blur()")
        pw.get_by_role("button", name="開始使用").click()
        pw.clock.run_for(6000); pw.wait_for_timeout(300); snap(pw, "08f-onboarding-wait-5s")
        pw.clock.run_for(15000); pw.wait_for_timeout(300); snap(pw, "08g-onboarding-wait-20s")
        for st, name in (("unreachable", "08d-onboarding-unreachable"), ("offline", "08e-onboarding-offline")):
            go(pg, "onboarding", f"&ob={st}"); pg.get_by_role("radio", name="我是 Brian").click()
            pg.get_by_placeholder("兩人用同一組").fill("sicily-demo"); pg.evaluate("document.activeElement.blur()")
            pg.evaluate("document.getElementById('ob-secret').closest('section').querySelector('[data-slot=alert]').scrollIntoView({block: 'end'})"); pg.wait_for_timeout(200)
            snap(pg, name)

        # 9 設定
        go(pg, "settings"); snap(pg, "09-settings")
        go(pg, "settings", "&full"); snap(pg, "09-settings-full")
        # 改生日日期 → 「生日是估計的」自動關掉，預覽變成確切年齡
        go(pg, "settings"); pg.get_by_label("生日", exact=True).fill("2025-10-18"); pg.evaluate("document.activeElement.blur()")
        pg.wait_for_timeout(200); snap(pg, "09c-settings-birthday-exact")
        go(pg, "settings"); pg.get_by_label("電話").fill("02-0000-0000")
        pg.evaluate("document.activeElement.blur()")  # 收起鍵盤再按返回
        pg.get_by_role("button", name="首頁").click()
        pg.wait_for_timeout(500); snap(pg, "09b-settings-unsaved-sheet")
        b.close()

run()
