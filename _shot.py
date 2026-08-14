import os, sys, asyncio
from playwright.async_api import async_playwright

ROOT = "http://localhost:8123/"
PAGES = ["index.html", "about.html", "services.html", "why-velora.html", "glimpses.html", "contact.html"]
VIEWPORTS = {"desktop": (1440, 900), "tablet": (820, 1180), "mobile": (390, 844)}
OUT = "_shots"

async def main():
    os.makedirs(OUT, exist_ok=True)
    errors = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        for vp, (w, h) in VIEWPORTS.items():
            ctx = await browser.new_context(viewport={"width": w, "height": h},
                                            device_scale_factor=1,
                                            reduced_motion="reduce")
            page = await ctx.new_page()
            page.on("console", lambda m: errors.append(f"[console:{m.type}] {m.text}") if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(f"[pageerror] {e}"))
            page.on("requestfailed", lambda r: errors.append(f"[404?] {r.url} {r.failure}"))
            for name in PAGES:
                await page.goto(ROOT + name, wait_until="load")
                await page.wait_for_timeout(900)
                # force all reveals visible for the screenshot
                await page.evaluate("document.querySelectorAll('[data-reveal]').forEach(e=>e.classList.add('in'));"
                                    "document.querySelector('.preloader')?.classList.add('done');")
                await page.wait_for_timeout(500)
                full = vp == "desktop"
                await page.screenshot(path=f"{OUT}/{vp}-{name.replace('.html','')}.png", full_page=full)
                # horizontal overflow check
                ow = await page.evaluate("document.documentElement.scrollWidth")
                iw = await page.evaluate("window.innerWidth")
                if ow > iw + 2:
                    culprits = await page.evaluate("""(iw)=>[...document.querySelectorAll('*')]
                        .filter(e=>{const r=e.getBoundingClientRect();return r.right>iw+2||r.left<-2})
                        .slice(0,6).map(e=>e.tagName+'.'+(e.className||'').toString().slice(0,45))""", iw)
                    errors.append(f"[overflow] {vp}/{name}: scrollWidth {ow} > {iw} :: {culprits}")
            await ctx.close()
        await browser.close()
    print("\n".join(errors) if errors else "No console/network/overflow errors.")

asyncio.run(main())
