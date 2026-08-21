"""Structural + behavioural verification for the VELORA site."""
import asyncio, re, os, glob, html.parser
from playwright.async_api import async_playwright

PAGES = ["index.html", "about.html", "services.html", "glimpses.html",
         "why-influencer-marketing.html", "contact.html"]
FAIL = []
def ck(cond, label, detail=""):
    print(f"  [{'PASS' if cond else 'FAIL'}] {label}" + (f" :: {detail}" if detail else ""))
    if not cond: FAIL.append(label)

# ---------- static ----------
print("== static: assets, anchors, tag balance ==")
for p in sorted(glob.glob("*.html")):
    src = open(p, encoding="utf-8").read()
    missing = []
    for attr, val in re.findall(r'(src|href)="([^"]+)"', src):
        if val.startswith(("http", "mailto:", "tel:", "#", "data:")):
            continue
        t = val.split("#")[0]
        if t and not os.path.exists(t):
            missing.append(f"{attr}={val}")
    ck(not missing, f"{p}: local refs resolve", "; ".join(missing[:4]))
    dangling = [a for a in re.findall(r'href="#([A-Za-z0-9_-]+)"', src)
                if f'id="{a}"' not in src]
    ck(not dangling, f"{p}: in-page anchors resolve", "; ".join(dangling[:4]))

    class Bal(html.parser.HTMLParser):
        VOID = {"area","base","br","col","embed","hr","img","input","link","meta","source","track","wbr"}
        def __init__(s):
            super().__init__(); s.stack=[]; s.err=[]
        def handle_starttag(s,t,a):
            if t not in s.VOID: s.stack.append((t,s.getpos()[0]))
        def handle_endtag(s,t):
            if t in s.VOID: return
            if not s.stack: s.err.append(f"stray </{t}> L{s.getpos()[0]}"); return
            if s.stack[-1][0]!=t:
                s.err.append(f"</{t}> L{s.getpos()[0]} vs open <{s.stack[-1][0]}> L{s.stack[-1][1]}")
                for i in range(len(s.stack)-1,-1,-1):
                    if s.stack[i][0]==t: del s.stack[i:]; return
            else: s.stack.pop()
    b = Bal(); b.feed(src)
    probs = b.err + [f"unclosed <{t}> L{l}" for t,l in b.stack]
    ck(not probs, f"{p}: tags balanced", "; ".join(probs[:3]))

css = open("style.css", encoding="utf-8").read()
ck(css.count("{") == css.count("}"), "style.css: braces balanced",
   f"{css.count('{')} vs {css.count('}')}")
js = open("script.js", encoding="utf-8").read()
ck(js.count("{") == js.count("}"), "script.js: braces balanced")

css_classes = set(re.findall(r'\.([A-Za-z][\w-]*)', re.sub(r'/\*.*?\*/','',css,flags=re.S)))
used = set()
for p in PAGES:
    for cl in re.findall(r'class="([^"]+)"', open(p, encoding="utf-8").read()):
        used.update(cl.split())
undef = sorted(c for c in used if c not in css_classes)
ck(not undef, "every class used in HTML has a CSS rule", ", ".join(undef[:8]))

print("\n== hero markup ==")
idx = open("index.html", encoding="utf-8").read()
ck('src="assets/hero-loop.mp4"' in idx, "hero uses the cleaned loop")
ck("hero-clients" in idx and len(re.findall(r'class="hero-client ', idx)) == 5,
   "five client marks", str(len(re.findall(r'class="hero-client ', idx))))
ck("hero-accent" in idx, "accent phrase present")
ck("hero-lead-text" not in idx, "lead paragraph removed (minimal copy)")
ck("hero-actions" not in idx, "hero button row removed (minimal copy)")
ck("hero-badge" not in idx, "hero badge removed (minimal copy)")
ck("nav-icons" not in idx, "nav icon cluster removed (minimal navbar)")
ck("Start a Campaign" in idx, "nav CTA retained")

# ---------- live ----------
async def live():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])

        print("\n== hero: video plays and is not dimmed ==")
        ctx = await b.new_context(viewport={"width": 1440, "height": 900})
        page = await ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        bad = []
        page.on("response", lambda r: bad.append(f"{r.status} {r.url.split('/')[-1]}") if r.status >= 400 else None)
        await page.goto("http://localhost:8123/index.html", wait_until="load")
        await page.wait_for_timeout(2600)
        v = await page.evaluate("""() => { const v = document.querySelector('.hero-video video');
            const cs = getComputedStyle(v);
            return { paused: v.paused, t: v.currentTime, dur: +v.duration.toFixed(2),
                     loop: v.loop, muted: v.muted, src: v.currentSrc.split('/').pop(),
                     opacity: cs.opacity, filter: cs.filter,
                     w: v.videoWidth, h: v.videoHeight }; }""")
        ck(not v["paused"], "hero video is playing")
        ck(v["t"] > 0.4, "playhead advancing", f"t={v['t']:.2f}s")
        ck(v["loop"] and v["muted"], "muted + looping (autoplay-safe)")
        ck(v["src"] == "hero-loop.mp4", "playing the cleaned loop", v["src"])
        ck(abs(v["dur"] - 6.7) < 0.2, "loop is the trimmed 6.7s", f"{v['dur']}s")
        ck(v["opacity"] == "1", "video at full opacity", v["opacity"])
        ck("blur" not in v["filter"], "video not blurred", v["filter"])

        print("\n== client marks ==")
        c = await page.evaluate("""() => [...document.querySelectorAll('.hero-client')].map(li => {
            const img = li.querySelector('img'); const r = li.getBoundingClientRect();
            return { alt: img.alt, loaded: img.complete && img.naturalWidth > 0,
                     nat: img.naturalWidth, d: Math.round(r.width),
                     visible: r.width > 0 && getComputedStyle(li).display !== 'none' }; })""")
        for x in c:
            ck(x["loaded"], f"logo loads: {x['alt']}", f"natural={x['nat']}px")
            ck(x["visible"], f"logo visible: {x['alt']}", f"{x['d']}px disc")

        print("\n== floats do not sit on the headline text ==")
        for label, (vw, vh) in {"desktop": (1440, 900), "mobile": (390, 844)}.items():
            c2 = await b.new_context(viewport={"width": vw, "height": vh})
            p2 = await c2.new_page()
            await p2.goto("http://localhost:8123/index.html", wait_until="load")
            await p2.wait_for_timeout(1500)
            hit = await p2.evaluate("""() => {
              // measure the real glyph box via a Range over the h1 text
              const h1 = document.querySelector('.hero-main-title');
              const rng = document.createRange(); rng.selectNodeContents(h1);
              const lines = [...rng.getClientRects()];
              const fl = [...document.querySelectorAll('.floats .float-btn')]
                          .map(e => e.getBoundingClientRect())
                          .filter(r => r.width > 0);
              const overlaps = [];
              for (const l of lines) for (const f of fl) {
                if (l.right > f.left && l.left < f.right && l.bottom > f.top && l.top < f.bottom)
                  overlaps.push({line: [Math.round(l.left), Math.round(l.right)],
                                 float: [Math.round(f.left), Math.round(f.right)]});
              }
              return { lineCount: lines.length, overlaps };
            }""")
            ck(not hit["overlaps"], f"{label}: no float overlaps headline glyphs",
               str(hit["overlaps"][:2]))
            await c2.close()

        print("\n== nav ==")
        n = await page.evaluate("""() => {
            const nav = document.querySelector('.nav');
            return { icons: !!document.querySelector('.nav-icons'),
                     links: [...document.querySelectorAll('.nav-menu .nav-link')].map(a=>a.textContent.trim().split(' ')[0]),
                     cta: !!document.querySelector('.nav-cta .btn'),
                     transparentAtTop: getComputedStyle(nav).backgroundColor,
                     stuck: nav.classList.contains('stuck') }; }""")
        ck(not n["icons"], "icon cluster gone")
        ck(n["cta"], "CTA pill present")
        ck(len(n["links"]) >= 5, "nav links intact", str(n["links"]))
        ck(not n["stuck"], "nav starts un-stuck (transparent over video)")
        await page.evaluate("window.scrollTo(0, 600)")
        await page.wait_for_timeout(500)
        ck(await page.evaluate("document.querySelector('.nav').classList.contains('stuck')"),
           "nav gains its backdrop after scrolling")

        print("\n== drawer (mobile nav) ==")
        c3 = await b.new_context(viewport={"width": 390, "height": 844})
        p3 = await c3.new_page()
        await p3.goto("http://localhost:8123/index.html", wait_until="load")
        await p3.wait_for_timeout(1200)
        await p3.click(".burger")
        await p3.wait_for_timeout(500)
        ck(await p3.evaluate("document.querySelector('.nav-drawer').classList.contains('open')"),
           "burger opens the drawer")
        await p3.keyboard.press("Escape")
        await p3.wait_for_timeout(400)
        ck(not await p3.evaluate("document.querySelector('.nav-drawer').classList.contains('open')"),
           "Escape closes the drawer")
        await c3.close()

        print("\n== no horizontal scroll anywhere ==")
        for label, (vw, vh) in {"desktop": (1440, 900), "tablet": (820, 1180), "mobile": (390, 844)}.items():
            c4 = await b.new_context(viewport={"width": vw, "height": vh})
            p4 = await c4.new_page()
            for pg in PAGES:
                await p4.goto(f"http://localhost:8123/{pg}", wait_until="load")
                await p4.wait_for_timeout(500)
                x = await p4.evaluate("() => { scrollTo(9999,0); const x=scrollX; scrollTo(0,0); return x; }")
                ck(x == 0, f"{label}/{pg}", f"scrollX={x}")
            await c4.close()

        print("\n== console + network ==")
        ck(not errs, "no JS errors", "; ".join(errs[:3]))
        ck(not bad, "no 4xx/5xx", "; ".join(bad[:4]))
        await ctx.close()
        await b.close()

asyncio.run(live())
print("\n" + ("ALL CHECKS PASSED" if not FAIL
              else f"{len(FAIL)} FAILURE(S):\n  - " + "\n  - ".join(FAIL)))
