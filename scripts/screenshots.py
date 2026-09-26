"""App 冒煙測試＋截圖（本機試用模式）：390×844。先 `npm run build && npx vite preview --port 4173`。
用法：python3 scripts/screenshots.py [base_url]；輸出到 screens/（不進 repo）。"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173/"
OUT = pathlib.Path(__file__).resolve().parent.parent / "screens"
OUT.mkdir(exist_ok=True)
errors = []

with sync_playwright() as p:
    # 預設用 Playwright 自帶的 Chromium（pip install playwright && playwright install chromium）；想用系統 Chrome 就設 CHROME_PATH
    b = p.chromium.launch(executable_path=os.environ.get("CHROME_PATH") or None, args=["--lang=zh-TW"])
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, locale="zh-TW",
                        timezone_id="Asia/Taipei", service_workers="block", reduced_motion="reduce")
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    def snap(name):
        pg.wait_for_timeout(500)
        pg.screenshot(path=str(OUT / f"{name}.png"))
        print("saved", name)

    pg.goto(BASE)
    pg.wait_for_timeout(800)
    snap("01-onboarding")
    pg.get_by_role("radio", name="Mia").click()
    pg.get_by_role("button", name="開始使用").click()
    pg.wait_for_timeout(1200)
    snap("02-home")
    pg.get_by_role("button", name="一切正常").click()
    snap("03-home-litter-toast")
    pg.goto(BASE + "#feed"); pg.wait_for_timeout(800)
    snap("04-feed")
    pg.get_by_role("button", name="Hello Fresh 鯖魚").first.click()
    snap("05-feed-logged")
    pg.goto(BASE + "#settings"); pg.wait_for_timeout(800)
    snap("06-settings")
    pg.goto(BASE + "#timeline"); pg.wait_for_timeout(800)
    snap("07-timeline")
    pg.goto(BASE + "#home"); pg.wait_for_timeout(800)
    snap("08-home-after")
    b.close()

print("ERRORS:", errors or "none")
