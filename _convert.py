"""Migrate about/services/why-velora/glimpses/contact onto the new bright, box-free system.

These five pages were generated from one template, so the markup is regular
enough to convert mechanically rather than by hand. The moves are:

  * brand name rendered VELORA in caps everywhere it is prose (never in a
    filename, so matching capital-V "Velora" is safe)
  * .grid/.card panels -> the borderless .offer list used on the homepage
  * .trait-grid, .stat-strip, .form-shell -> box-free equivalents
  * inline color:#fff and the old dark CSS variables removed, since white text
    and dark-theme tokens are invisible or undefined on the cream ground
  * .gold-text -> .gold-solid on bright ground (.gold-text is the white->gold
    ramp and only reads on ink)
  * footer replaced with the oversized "Let's Talk" + ghost wordmark version

_verify.py checks tag balance and that every class used exists in CSS, so a bad
conversion fails loudly rather than silently.
"""
import re
import glob

PAGES = ["about.html", "services.html", "why-velora.html", "glimpses.html", "contact.html"]
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
TAG = re.compile(r"<(/?)([a-zA-Z][\w-]*)([^>]*?)(/?)>")


def match_close(src, open_start):
    """Index just past the close tag matching the element opening at open_start."""
    m = TAG.match(src, open_start)
    name = m.group(2).lower()
    depth = 0
    pos = open_start
    while True:
        m = TAG.search(src, pos)
        if not m:
            raise ValueError(f"unbalanced <{name}> from offset {open_start}")
        tag = m.group(2).lower()
        closing, selfclose = m.group(1) == "/", m.group(4) == "/"
        pos = m.end()
        if tag != name or tag in VOID or selfclose:
            continue
        depth += -1 if closing else 1
        if depth == 0:
            return m.end()


def replace_block(src, opener_re, build):
    """Rewrite each element whose opening tag matches opener_re via build(inner, attrs)."""
    out = src
    search_from = 0
    while True:
        m = re.compile(opener_re).search(out, search_from)
        if not m:
            return out
        end = match_close(out, m.start())
        open_end = out.index(">", m.start()) + 1
        close_start = out.rindex("<", 0, end)
        inner = out[open_end:close_start]
        new = build(inner, m.group(0))
        out = out[:m.start()] + new + out[end:]
        search_from = m.start() + len(new)


# --------------------------------------------------------------- card -> offer
def convert_card(inner, opener):
    reveal = 'data-reveal="right"' if 'data-reveal="right"' in opener else "data-reveal"

    # Existing numeric badge, if the card had one
    num = None
    mnum = re.search(r'<span class="card-index">(\d+)</span>', inner)
    if mnum:
        num = mnum.group(1)
        inner = inner.replace(mnum.group(0), "")

    inner = re.sub(r'<div class="medallion">', '<div class="offer-icon">', inner)
    inner = re.sub(r'<div class="sparkle-divider"></div>\s*', "", inner)
    inner = re.sub(r'<h3 class="card-title">', '<h3 class="offer-name">', inner)
    inner = re.sub(r'<ul class="card-list">', '<ul class="offer-list">', inner)
    # Plain paragraphs become the muted description line
    inner = re.sub(r"<p>", '<p class="offer-desc">', inner)

    slot = f'<span class="offer-num">{num}</span>' if num else "@@NUM@@"
    return f'<article class="offer-item" {reveal}>{slot}{inner}</article>'


def convert_trait(inner, opener):
    inner = re.sub(r'<div class="medallion">', '<div class="offer-icon">', inner)
    inner = re.sub(r'<div class="sparkle-divider"></div>\s*', "", inner)
    inner = re.sub(r'<h3 class="card-title">', '<h3 class="offer-name">', inner)
    inner = re.sub(r"<p>", '<p class="offer-desc">', inner)
    return f'<article class="offer-item" data-reveal>@@NUM@@{inner}</article>'


def number_offers(src):
    """Fill @@NUM@@ placeholders, restarting the count in each .offer container."""
    parts = re.split(r'(<div class="offer(?:[^"]*)">)', src)
    for i, chunk in enumerate(parts):
        if chunk.startswith('<div class="offer'):
            continue
        n = 0

        def bump(_):
            nonlocal n
            n += 1
            return f'<span class="offer-num">{n:02d}</span>'

        parts[i] = re.sub(r"@@NUM@@", bump, chunk)
    return "".join(parts)


NEW_FOOTER = '''<footer class="footer">
  <div class="shell">
    <div class="footer-shout" data-reveal>
      <h2 class="gold-text">Let's Talk</h2>
      <a class="footer-mail" href="mailto:Shubh@peculiex.com">Shubh@peculiex.com</a>
    </div>
    <div class="footer-grid">
      <div class="footer-brand">
        <img src="assets/velora-logo.png" alt="VELORA — Influencer Marketing">
        <p>Where influence meets impact.</p>
        <div class="socials">
          <a href="https://www.instagram.com/" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg></a>
          <a href="https://linkedin.com" target="_blank" rel="noopener" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6c.6-1 1.9-1.9 3.7-1.9 2.7 0 4 1.7 4 5V21h-4v-6c0-1.5-.6-2.4-1.9-2.4-1.1 0-1.8.8-1.8 2.4V21h-3.8z"/></svg></a>
          <a href="https://youtube.com" target="_blank" rel="noopener" aria-label="YouTube"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5A2.7 2.7 0 0 0 2.4 7.2C2 8.9 2 12 2 12s0 3.1.4 4.8a2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9c.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8zM10 15.5v-7l6 3.5z"/></svg></a>
          <a href="https://wa.me/919013920785" target="_blank" rel="noopener" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2zm0 2a8 8 0 0 1 0 16 8 8 0 0 1-4.2-1.2l-.4-.2-2.6.7.7-2.5-.2-.4A8 8 0 0 1 12 4z"/></svg></a>
        </div>
      </div>
      <div>
        <h5>Explore</h5>
        <div class="footer-links">
          <a href="index.html">Home</a><a href="about.html">About VELORA</a><a href="services.html">Services</a>
          <a href="why-velora.html">Why VELORA</a><a href="glimpses.html">Glimpses</a><a href="contact.html">Contact</a>
        </div>
      </div>
      <div>
        <h5>Services</h5>
        <div class="footer-links">
          <a href="services.html#influencer">Influencer Marketing</a><a href="services.html#celebrity">Celebrity Management</a>
          <a href="services.html#movie">Movie Promotions</a><a href="services.html#social">Social Media Marketing</a>
          <a href="services.html#song">Song Promotion</a><a href="services.html#event">Event Promotion</a>
        </div>
      </div>
      <div>
        <h5>Get In Touch</h5>
        <div class="footer-links">
          <a href="https://wa.me/919013920785" target="_blank" rel="noopener">9013920785 (WhatsApp)</a>
          <a href="tel:+919871788896">9871788896 (Calling)</a>
          <a href="mailto:Shubh@peculiex.com">Shubh@peculiex.com</a>
          <a href="https://www.peculiex.com" target="_blank" rel="noopener">www.peculiex.com</a>
          <a href="https://maps.google.com/?q=Ashoka+Chambers+Rajendra+Place+New+Delhi+110060" target="_blank" rel="noopener">G/F, B-5, Ashoka Chambers,<br>Rajendra Place, Main Pusa Road,<br>New Delhi 110060</a>
        </div>
      </div>
    </div>
    <div class="footer-script"><p class="script">Together, let's make an impact</p></div>
    <div class="vvv">Value <i></i> Voice <i></i> Vision</div>
    <span class="footer-mega" aria-hidden="true">VELORA</span>
    <div class="footer-bottom">
      <span>&copy; <span data-year>2026</span> VELORA — Influencer Marketing. All rights reserved.</span>
      <span><a href="contact.html">Work with us</a></span>
    </div>
  </div>
</footer>'''

GALLERY = '''<div class="gallery">
          <figure data-reveal><img src="assets/gallery/glimpse-1.jpg" alt="Creator collaboration" loading="lazy">
            <figcaption>Creator Collaboration</figcaption>
          </figure>
          <figure data-reveal><img src="assets/gallery/glimpse-3.jpg" alt="Talent on location at night" loading="lazy">
            <figcaption>On Location</figcaption>
          </figure>
          <figure data-reveal><img src="assets/gallery/glimpse-2.jpg" alt="Artist session" loading="lazy">
            <figcaption>Artist Session</figcaption>
          </figure>
          <figure data-reveal><img src="assets/gallery/glimpse-5.jpg" alt="Event lounge" loading="lazy">
            <figcaption>Event Lounge</figcaption>
          </figure>
          <figure data-reveal><img src="assets/gallery/glimpse-4.jpg" alt="Creator meet" loading="lazy">
            <figcaption>Creator Meet</figcaption>
          </figure>
          <figure data-reveal><img src="assets/gallery/glimpse-6.jpg" alt="Studio session" loading="lazy">
            <figcaption>Studio Session</figcaption>
          </figure>
        </div>'''

REEL = '''<div class="reel" data-reveal="zoom">
          <div class="reel-frame">
            <!-- To change the showreel, replace assets/showreel.mp4 with the new file. -->
            <video id="showreel-full" poster="assets/hero-poster.jpg" controls playsinline preload="metadata">
              <source src="assets/showreel.mp4" type="video/mp4">
              Your browser does not support embedded video.
            </video>
          </div>
        </div>'''


def convert(path):
    src = open(path, encoding="utf-8").read()
    before = src

    # 1. Brand name in caps. Capital-V "Velora" never appears in a path.
    src = re.sub(r"\bVelora\b", "VELORA", src)

    # 2. Bright theme colour for the browser chrome
    src = src.replace('<meta name="theme-color" content="#05091a">',
                      '<meta name="theme-color" content="#fffaf0">')

    # 3. White inline text is invisible on cream — let it inherit
    src = re.sub(r'<span style="color:#fff">(.*?)</span>', r"\1", src, flags=re.S)

    # 4. .gold-text is the white->gold ramp; on cream use the darker .gold-solid
    src = src.replace("gold-text", "gold-solid")

    # 5. Drop the medallion from the goal statement (no icon slot in the new one)
    def strip_goal_medallion(m):
        return re.sub(r'<div class="medallion">.*?</svg></div>\s*', "", m.group(0), flags=re.S)

    src = re.sub(r'<div class="goal-pill".*?</div>', strip_goal_medallion, src, flags=re.S)

    # 6. Panels -> box-free lists
    src = replace_block(src, r'<article class="card[^"]*"[^>]*>', convert_card)
    src = replace_block(src, r'<div class="trait">', convert_trait)
    src = re.sub(r'<div class="grid grid-[34]">', '<div class="offer">', src)
    src = re.sub(r'<div class="grid grid-2">', '<div class="offer two">', src)
    src = re.sub(r'<div class="founder-media trait-grid"[^>]*>', '<div class="offer two">', src)
    src = re.sub(r'<div class="grid">', '<div class="offer one">', src)
    src = re.sub(r'<div class="stat-strip"', '<div class="stats"', src)
    src = re.sub(r'<div class="form-shell"', '<div class="form-wrap"', src)
    src = number_offers(src)

    # 7. Sand tint on the closing band so it separates from the ink footer
    src = src.replace('<section class="cta-band">', '<section class="cta-band tint">')

    # 8. Page-specific pieces
    if path == "glimpses.html":
        start = src.index('<div class="gallery">')
        src = src[:start] + GALLERY + src[match_close(src, start):]
        start = src.index('<div data-reveal="zoom"')
        src = src[:start] + REEL + src[match_close(src, start):]

    # 9. Shared footer
    src = re.sub(r'<footer class="footer">.*?</footer>', lambda _: NEW_FOOTER, src, flags=re.S)

    open(path, "w", encoding="utf-8").write(src)
    print(f"{path}: {'rewritten' if src != before else 'unchanged'} "
          f"({len(before)} -> {len(src)} bytes)")


for p in PAGES:
    convert(p)

leftover = {}
for p in sorted(glob.glob("*.html")):
    s = open(p, encoding="utf-8").read()
    hits = [c for c in ("class=\"card", "grid-3", "grid-4", "medallion", "sparkle-divider",
                        "stat-strip", "form-shell", "trait", "card-title", "card-index",
                        "gold-text", "color:#fff", "--hairline", "--shadow-lg")
            if c in s]
    if hits:
        leftover[p] = hits
print("\nleftover dark/box markers:", leftover or "none")
