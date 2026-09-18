"""Real-browser check of the admin area. Run with the dev server up:
    ADMIN_PASSWORD=... python3 scripts/admin-ui-test.py [baseUrl]
Needs playwright (pip install playwright && playwright install chromium)."""
import asyncio, os, sys
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
PASSWORD = os.environ.get("ADMIN_PASSWORD") or sys.exit("set ADMIN_PASSWORD")
failures = 0

def check(name, ok, detail=""):
    global failures
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  ({detail})" if detail else ""))
    failures += 0 if ok else 1

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1280, "height": 900})
        errors = []
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        await pg.goto(f"{BASE}/admin", wait_until="networkidle")
        check("/admin redirects to login", pg.url.endswith("/admin/login"), pg.url)

        await pg.fill("#password", "wrong-password")
        await pg.click("button[type=submit]")
        await pg.wait_for_url("**/admin/login?error=wrong")
        await pg.wait_for_timeout(500)
        body = await pg.inner_text("body")
        check("wrong password shows error", "Feil passord." in body)

        await pg.fill("#password", PASSWORD)
        await pg.click("button[type=submit]")
        await pg.wait_for_url(f"{BASE}/admin")
        check("correct password lands on /admin", True)
        await pg.click("text=Reindekser")
        await pg.wait_for_url("**/admin?reindexed=*")
        note = await pg.locator("text=Reindeksering ferdig").inner_text()
        check("reindex reports a count", "samtaler i indeksen" in note, note)
        rows = pg.locator("ol li a")
        n = await rows.count()
        check("chat list has rows", n > 0, f"{n} rows on page")
        await pg.screenshot(path="admin-list.png")

        await rows.first.click()
        await pg.wait_for_url("**/admin/*")
        await pg.wait_for_timeout(500)
        text = await pg.inner_text("main") if await pg.locator("main").count() else await pg.inner_text("body")
        check("transcript renders a user question and an answer", "Alle samtaler" in text and len(text) > 200)
        check("transcript has no chat input", await pg.locator("textarea").count() == 0)
        await pg.screenshot(path="admin-detail.png")

        await pg.goto(f"{BASE}/admin")
        await pg.click("text=Logg ut")
        await pg.wait_for_url("**/admin/login")
        check("logout returns to login", True)
        check("no console errors", not errors, "; ".join(errors[:3]))
        await b.close()

asyncio.run(main())
print("\nAll checks passed" if not failures else f"\n{failures} check(s) failed")
sys.exit(1 if failures else 0)
