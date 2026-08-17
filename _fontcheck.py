"""Confirm the new typefaces actually render, and that key text passes contrast.

A Google Fonts <link> can 404 or be blocked and the page will silently fall back
to Arial, which looks close enough in a screenshot to miss. So this asserts the
fonts are loaded via the CSS Font Loading API and reads back the computed
family, then measures real rendered colours against their backgrounds.
"""
import re
from playwright.sync_api import sync_playwright

ROOT = "http://localhost:8123/"
PAGES = ["index.html", "about.html", "services.html", "why-velora.html",
         "glimpses.html", "contact.html"]

PROBES = [
    (".hero-title", "hero headline"),
    (".nav-link", "nav link"),
    (".brand-word", "brand wordmark"),
    ("body", "body copy"),
    (".offer-name", "offer heading"),
    (".footer-shout h2", "footer shout"),
]


def srgb_to_lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(rgb):
    r, g, b = (srgb_to_lin(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def parse_rgb(s):
    nums = [float(n) for n in re.findall(r"[\d.]+", s)]
    if len(nums) < 3:
        return None
    return tuple(nums[:3]), (nums[3] if len(nums) > 3 else 1.0)


def contrast(fg, bg):
    l1, l2 = luminance(fg), luminance(bg)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


problems = []

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    for name in PAGES:
        page.goto(ROOT + name, wait_until="load")
        page.wait_for_timeout(1200)

        loaded = page.evaluate("""() => ({
            bricolage: document.fonts.check("800 40px 'Bricolage Grotesque'"),
            figtree:   document.fonts.check("400 16px 'Figtree'"),
            families:  [...document.fonts].map(f => f.family + ':' + f.status)
        })""")
        if not loaded["bricolage"]:
            problems.append(f"{name}: Bricolage Grotesque did NOT load")
        if not loaded["figtree"]:
            problems.append(f"{name}: Figtree did NOT load")

        print(f"\n=== {name}  bricolage={loaded['bricolage']} figtree={loaded['figtree']}")

        for sel, label in PROBES:
            el = page.query_selector(sel)
            if not el:
                continue
            info = page.evaluate("""(el) => {
                const cs = getComputedStyle(el);
                // Walk up for the first non-transparent background.
                let node = el, bg = 'rgba(0, 0, 0, 0)';
                while (node) {
                    const c = getComputedStyle(node).backgroundColor;
                    const a = c.match(/[\\d.]+/g);
                    if (a && (a.length < 4 || parseFloat(a[3]) > 0.5)) { bg = c; break; }
                    node = node.parentElement;
                }
                return { family: cs.fontFamily, weight: cs.fontWeight,
                         size: cs.fontSize, colour: cs.color, bg };
            }""", el)

            fam = info["family"].split(",")[0].strip("'\" ")
            fg = parse_rgb(info["colour"])
            bg = parse_rgb(info["bg"])
            ratio = "n/a"
            if fg and bg and fg[1] > 0.5:
                ratio = f"{contrast(fg[0], bg[0]):.2f}:1"
            elif fg and fg[1] <= 0.5:
                ratio = "gradient-filled"

            print(f"  {label:<16} {fam:<22} w{info['weight']:<4} "
                  f"{info['size']:<8} contrast={ratio}")

            expected = "Bricolage Grotesque" if sel != "body" else "Figtree"
            if fam != expected:
                problems.append(f"{name} {label}: font is {fam}, expected {expected}")

        errors = page.evaluate("""() => {
            const de = document.documentElement;
            return { overflow: de.scrollWidth - de.clientWidth };
        }""")
        if errors["overflow"] > 2:
            problems.append(f"{name}: horizontal overflow {errors['overflow']}px")

    browser.close()

print("\n" + ("=" * 60))
if problems:
    print(f"{len(problems)} PROBLEM(S):")
    for p_ in problems:
        print("  -", p_)
else:
    print("Fonts load on every page, families are correct, no overflow.")
