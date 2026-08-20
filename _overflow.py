"""Find what actually widens the document, ignoring legitimate scroll/clip containers.

body carries overflow-x:hidden sitewide, so it must not count as a clipping
ancestor or every element gets filtered out and the report comes back empty.
"""
from playwright.sync_api import sync_playwright

JS = """() => {
    const vw = document.documentElement.clientWidth;
    const clipped = (el) => {
        for (let n = el.parentElement; n && n !== document.body
             && n !== document.documentElement; n = n.parentElement) {
            const ox = getComputedStyle(n).overflowX;
            if (ox === 'hidden' || ox === 'auto' || ox === 'scroll' || ox === 'clip') return true;
        }
        return false;
    };
    const out = [];
    document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) return;
        const over = Math.round(r.right - vw);
        const under = Math.round(-r.left);
        if ((over > 1 || under > 1) && !clipped(el)) {
            const cs = getComputedStyle(el);
            out.push({
                tag: el.tagName.toLowerCase(),
                cls: (el.className || '').toString().slice(0, 34),
                over, under, w: Math.round(r.width),
                pos: cs.position, ox: cs.overflowX
            });
        }
    });
    return out.sort((a, b) => Math.max(b.over, b.under) - Math.max(a.over, a.under)).slice(0, 12);
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    for w in (390, 820, 1440):
        page = b.new_page(viewport={"width": w, "height": 900})
        page.goto("http://localhost:8123/index.html", wait_until="load")
        page.wait_for_timeout(1600)
        page.evaluate("document.querySelector('.preloader')?.remove()")
        sw, cw = page.evaluate(
            "() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]")
        print(f"\n=== viewport {w}: scrollWidth {sw} vs clientWidth {cw} (overflow {sw - cw})")
        for o in page.evaluate(JS):
            print(f"   over={o['over']:>5} under={o['under']:>5}  {o['tag']:<6} "
                  f".{o['cls']:<34} w={o['w']:>5} pos={o['pos']:<9} ox={o['ox']}")
        page.close()
    b.close()
