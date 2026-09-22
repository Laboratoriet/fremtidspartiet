"""Real-browser check of the admin feed controls. Server must run with
PUBLIC_FEED_DELAY_MINUTES=0.   ADMIN_PASSWORD=... python3 scripts/admin-feed-test.py [baseUrl]"""
import asyncio, json, os, random, string, sys, urllib.request
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
PASSWORD = os.environ.get("ADMIN_PASSWORD") or sys.exit("set ADMIN_PASSWORD")
failures = 0
def check(name, ok, detail=""):
    global failures
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  ({detail})" if detail else "")); failures += 0 if ok else 1
def rid(): return ''.join(random.choices(string.ascii_letters + string.digits, k=16))

# A chat whose question the reviewer rejects (junk), so the admin has to add it by hand
cookie = None
with urllib.request.urlopen(BASE + "/") as r:
    for k, v in r.headers.items():
        if k.lower() == "set-cookie" and "fp_visitor" in v: cookie = v.split(";")[0]
chat_id = rid()
question = "Test " + rid()[:6] + " kan vises av admin"
body = json.dumps({"id": chat_id, "isSearchEnabled": False, "messages": [{"id": "u1", "role": "user", "content": question}]}).encode()
urllib.request.urlopen(urllib.request.Request(BASE + "/api/chat", data=body, method="POST", headers={"Content-Type": "application/json", "Cookie": cookie}), timeout=90).read()

def feed():
    return [q["question"] for q in json.load(urllib.request.urlopen(BASE + "/api/feed"))["questions"]]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 1280, "height": 900})
        await pg.goto(f"{BASE}/admin/login"); await pg.fill("#password", PASSWORD); await pg.click("button[type=submit]"); await pg.wait_for_url(f"{BASE}/admin")
        await pg.goto(f"{BASE}/admin/{chat_id}", wait_until="networkidle")
        await pg.wait_for_timeout(3000)  # let the after-response review finish
        await pg.reload(wait_until="networkidle")
        status = await pg.locator("section[aria-label=Forsiden]").inner_text()
        check("rejected question shows as not on the feed", "Ikke på forsiden" in status, status.split("\n")[0])
        await pg.click("text=Legg på forsiden"); await pg.wait_for_timeout(1500)
        status = await pg.locator("section[aria-label=Forsiden]").inner_text()
        check("admin can force a question onto the feed", "Vises under" in status, status.split("\n")[0])
        check("forced question is served by /api/feed", any(question.lower()[:20] in q.lower() for q in feed()))
        await pg.click("text=Fjern fra forsiden"); await pg.wait_for_timeout(1500)
        status = await pg.locator("section[aria-label=Forsiden]").inner_text()
        check("admin can remove it again", "Ikke på forsiden" in status, status.split("\n")[0])
        check("removed question is gone from /api/feed", not any(question.lower()[:20] in q.lower() for q in feed()))
        await pg.goto(f"{BASE}/admin", wait_until="networkidle")
        await pg.click("text=Fyll forsiden"); await pg.wait_for_url("**/admin?feed=*", timeout=180000)
        banner = await pg.locator("text=Forsiden fylt").inner_text()
        check("backfill runs and reports", "godkjent" in banner, banner)
        await pg.screenshot(path="admin-feed.png")
        await b.close()
asyncio.run(main())
urllib.request.urlopen(urllib.request.Request(f"{BASE}/api/chat/{chat_id}", method="DELETE", headers={"Cookie": cookie})).read()
print("\nAll checks passed" if not failures else f"\n{failures} check(s) failed"); sys.exit(1 if failures else 0)
