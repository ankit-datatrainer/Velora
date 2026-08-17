"""Roll the Oreo-flavoured type + header + motion hooks across all six pages.

What this does per page:
  1. swaps the Google Fonts link to Bricolage Grotesque + Figtree
  2. replaces the header with the oreo.com-style bar: circular emblem badge and
     wordmark, heavy tight uppercase nav, a real Services dropdown behind the
     caret, round icon buttons, gradient pill CTA
  3. sets theme-color to the new bright electric blue
  4. adds .magnetic to every button so they lean toward the cursor
  5. switches gradient-filled headings to the wipe reveal, because splitting
     them per character would break the background-clip fill
  6. mounts a confetti canvas in the hero and the closing CTA band

_verify.py then re-checks tag balance and that every class used exists in CSS.
"""
import re

PAGES = ["index.html", "about.html", "services.html", "why-velora.html",
         "glimpses.html", "contact.html"]

FONT_LINK = '''<link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Figtree:ital,wght@0,300..900;1,300..900&display=swap"
        rel="stylesheet">'''

CARET = ('<svg class="nav-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
         'stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>')

NAV_ITEMS = [
    ("index.html", "Home"),
    ("about.html", "About"),
    ("services.html", "Services"),
    ("why-velora.html", "Why VELORA"),
    ("glimpses.html", "Glimpses"),
    ("contact.html", "Contact"),
]

SERVICE_SUB = [
    ("services.html#influencer", "Influencer Marketing"),
    ("services.html#celebrity", "Celebrity Management"),
    ("services.html#movie", "Movie Promotions"),
    ("services.html#social", "Social Media Marketing"),
    ("services.html#song", "Song Promotion"),
    ("services.html#event", "Event Promotion"),
]


def header_for(page):
    items = []
    for href, label in NAV_ITEMS:
        current = ' aria-current="page"' if href == page else ""
        if href == "services.html":
            subs = "\n".join(
                f'                        <a href="{h}">{t}</a>' for h, t in SERVICE_SUB)
            items.append(
                f'                <li>\n'
                f'                    <a class="nav-link" href="{href}"{current}>{label} {CARET}</a>\n'
                f'                    <div class="nav-sub">\n{subs}\n                    </div>\n'
                f'                </li>'
            )
        else:
            items.append(
                f'                <li><a class="nav-link" href="{href}"{current}>{label}</a></li>')
    menu = "\n".join(items)

    return f'''<header class="nav">
        <div class="nav-inner">
            <a class="brand" href="index.html" aria-label="VELORA home">
                <span class="brand-badge"><img src="assets/velora-emblem.png" alt=""></span>
                <span class="brand-word">VELORA</span>
            </a>

            <nav aria-label="Primary">
                <ul class="nav-menu">
{menu}
                </ul>
            </nav>

            <div class="nav-cta">
                <div class="nav-icons">
                    <a class="nav-ic" href="tel:+919871788896" aria-label="Call VELORA">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
                        </svg>
                    </a>
                    <a class="nav-ic" href="https://www.instagram.com/" target="_blank" rel="noopener"
                        aria-label="VELORA on Instagram">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="5" />
                            <circle cx="12" cy="12" r="4" />
                            <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none" />
                        </svg>
                    </a>
                </div>
                <a class="btn btn-gold btn-sm magnetic" href="contact.html">Start a Campaign</a>
                <button class="burger" aria-label="Menu" aria-expanded="false" aria-controls="drawer">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </div>
    </header>'''


def theme(page):
    src = open(page, encoding="utf-8").read()
    before = src
    notes = []

    # 1. Fonts
    new, n = re.subn(
        r'<link rel="preconnect" href="https://fonts\.googleapis\.com">.*?rel="stylesheet">',
        lambda _: FONT_LINK, src, flags=re.S)
    if n:
        src = new
        notes.append("fonts")

    # 2. Header
    new, n = re.subn(r'<header class="nav">.*?</header>',
                     lambda _: header_for(page), src, flags=re.S)
    if n:
        src = new
        notes.append("header")

    # 3. Browser chrome colour
    new, n = re.subn(r'<meta name="theme-color" content="[^"]*">',
                     '<meta name="theme-color" content="#2b36f5">', src)
    if n:
        src = new
        notes.append("theme-color")

    # 4. Magnetic buttons (skip ones already tagged by the header template)
    def magnetise(m):
        cls = m.group(1)
        return m.group(0) if "magnetic" in cls else f'class="{cls} magnetic"'

    new, n = re.subn(r'class="(btn btn-[^"]*)"', magnetise, src)
    if n:
        src = new
        notes.append(f"magnetic x{n}")

    # 5. Gradient headings use the wipe, not the per-character split
    def maskify(m):
        tag = m.group(0)
        if 'data-reveal="' in tag:
            return tag
        return tag.replace("data-reveal", 'data-reveal="mask"', 1)

    new, n = re.subn(r'<h[12][^>]*\bdata-reveal\b[^>]*>(?=(?:(?!</h[12]>).)*gold-solid)',
                     maskify, src, flags=re.S)
    if n:
        src = new
        notes.append(f"mask x{n}")

    # 6. Confetti in the hero and the closing band
    for anchor, mount in (
        ('<section class="hero" id="top">', '\n            <canvas class="confetti" aria-hidden="true"></canvas>'),
        ('<section class="cta-band tint">', '\n            <canvas class="confetti" aria-hidden="true"></canvas>'),
    ):
        if anchor in src and "confetti" not in src.split(anchor)[1][:400]:
            src = src.replace(anchor, anchor + mount, 1)
            notes.append("confetti")

    open(page, "w", encoding="utf-8").write(src)
    print(f"{page:18} {'  '.join(notes) if notes else 'no change':<44} "
          f"{len(before)} -> {len(src)} bytes")


for p in PAGES:
    theme(p)
