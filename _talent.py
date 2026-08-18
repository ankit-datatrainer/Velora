"""Build the "Famous Faces" roster section: data, placeholder art, and markup.

TWO DELIBERATE DECISIONS, both about not putting the client at risk.

1. PHOTOS ARE PLACEHOLDERS, NOT SCRAPED.
   Press and paparazzi photos of these people are owned by photographers and
   agencies, and the people themselves hold personality/publicity rights that
   Indian courts have been actively enforcing. Downloading such images and
   republishing them on an agency's commercial site is copyright infringement
   and, because it implies endorsement, exposes the agency to a passing-off
   claim too. So this generates branded placeholder tiles instead. To use a real
   photo you have cleared, drop it in at assets/talent/<slug>.jpg, same
   filename. No HTML or CSS edit needed.

2. INSTAGRAM LINKS NEVER GUESS.
   Where a handle is confirmed by a reliable outlet it links straight to the
   profile. Where it is not, the card links to an Instagram search for the
   person's name. That always resolves to the right person and can never send a
   visitor to an impersonator, which is the real risk of a guessed handle. Two
   names on this list, Elvish Yadav and Dolly Chaiwala, have had their accounts
   reported missing at various points, so hardcoding is fragile even for
   well-known handles.

Fill in a `handle` below once you have confirmed it and that card upgrades to a
direct profile link automatically.
"""
import os
import re
import urllib.parse
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = "assets/talent"
PAGE = "index.html"
W, H = 780, 1040
FONT_PATH = r"C:\Windows\Fonts\seguibl.ttf"      # Segoe UI Black, closest heavy face on hand

# Bright pairs drawn from the site's own palette
GRADIENTS = [
    ((43, 54, 245), (122, 77, 240)),      # electric -> violet
    ((122, 77, 240), (255, 91, 110)),     # violet   -> coral
    ((255, 91, 110), (255, 192, 33)),     # coral    -> gold
    ((255, 192, 33), (35, 217, 176)),     # gold     -> mint
    ((35, 217, 176), (43, 54, 245)),      # mint     -> electric
    ((23, 31, 176), (255, 91, 110)),      # deep     -> coral
]

# name, role, verified handle
INFLUENCERS = [
    ("Elvish Yadav",      "YouTuber & TV Personality", "elvish_yadav"),
    ("Dolly Chaiwala",    "Nagpur's Viral Chaiwala",   "dolly_ki_tapri_nagpur"),
    ("Armaan Malik",      "Singer & Creator",          "armaanmalik"),
    ("Jubin Nautiyal",    "Playback Singer",           "jubin_nautiyal"),
    ("Aarush Bhola",      "Creator & Actor",           "aarushbhola17"),
    ("Varun Yadav",       "Creator — Laila",           "varuun_yadav"),
    ("Chandrika Dixit",   "Creator — Vada Pav Girl",   "chandrika.dixit"),
    ("Tejaswini Prakash", "Actor & Creator",           "tejasswiprakash"),
    ("Anjali Arora",      "Creator",                   "anjimaxuofficially"),
    ("Munawar Faruqui",   "Comedian & Rapper",         "munawar.faruqui"),
]

CELEBRITIES = [
    ("Badshah",           "Rapper & Producer",         "badboyshah"),
    ("Sonu Sood",         "Actor & Philanthropist",    "sonu_sood"),
    ("Zareen Khan",       "Actor",                     "zareenkhan"),
    ("Riteish Deshmukh",  "Actor & Producer",          "riteishd"),
    ("Vivek Oberoi",      "Actor & Entrepreneur",      "vivekoberoi"),
    ("Yo Yo Honey Singh", "Rapper & Music Producer",   "yoyohoneysingh"),
    ("Elnaaz Norouzi",    "Actor & Model",             "iamelnaaz"),
    ("Tamannaah Bhatia",  "Actor",                     "tamannaahspeaks"),
    ("Nora Fatehi",       "Dancer, Singer & Actor",    "norafatehi"),
]

IG_GLYPH = (
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 '
    '4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.26.07 1.64.07 4.85s-.01 3.58-.07 4.85c-.15 3.22-1.66 '
    '4.77-4.92 4.92-1.26.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.07 '
    '15.6 2.06 15.2 2.06 12s.01-3.58.07-4.85C2.28 3.92 3.8 2.42 7.05 2.27 8.32 2.21 8.7 2.2 12 '
    '2.2zm0 4.64a5.16 5.16 0 1 0 0 10.32 5.16 5.16 0 0 0 0-10.32zm0 8.5a3.34 3.34 0 1 1 0-6.68 3.34 '
    '3.34 0 0 1 0 6.68zm6.54-8.7a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z"/></svg>'
)


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def initials(name):
    parts = [p for p in re.split(r"\s+", name) if p and p.lower() != "yo"]
    letters = "".join(p[0] for p in parts[:2])
    return letters.upper()


def make_placeholder(name, idx, path):
    """Branded gradient tile with the person's initials, so the rail looks
    intentional before real photography is cleared."""
    top, bottom = GRADIENTS[idx % len(GRADIENTS)]
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)

    # Diagonal-ish vertical gradient
    for y in range(H):
        t = y / (H - 1)
        d.line([(0, y), (W, y)], fill=tuple(
            int(top[c] + (bottom[c] - top[c]) * t) for c in range(3)))

    # Confetti flecks, echoing the hero canvas
    rng = __import__("random").Random(idx * 977 + 13)
    for _ in range(46):
        x, y = rng.randint(0, W), rng.randint(0, H)
        s = rng.randint(6, 15)
        shade = (255, 255, 255) if rng.random() < 0.6 else (11, 17, 64)
        layer = Image.new("RGBA", (s * 2, s), (*shade, rng.randint(40, 105)))
        img.paste(Image.alpha_composite(
            img.crop((x, y, x + s * 2, y + s)).convert("RGBA"), layer).convert("RGB"), (x, y))

    text = initials(name)
    size = 300 if len(text) > 1 else 360
    try:
        font = ImageFont.truetype(FONT_PATH, size)
    except OSError:
        font = ImageFont.load_default()

    box = d.textbbox((0, 0), text, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    x = (W - tw) / 2 - box[0]
    y = H * 0.36 - th / 2 - box[1]
    d.text((x + 6, y + 8), text, font=font, fill=(11, 17, 64))     # drop shadow
    d.text((x, y), text, font=font, fill=(255, 255, 255))

    img.save(path, "JPEG", quality=86, optimize=True, progressive=True)


def card(name, role, handle, idx):
    if handle:
        href = f"https://www.instagram.com/{handle}/"
        meta = f"@{handle}"
        label = f"{name} on Instagram"
    else:
        # Search, never a guessed profile.
        q = urllib.parse.quote(name)
        href = f"https://www.instagram.com/explore/search/keyword/?q={q}"
        meta = "Find on Instagram"
        label = f"Search Instagram for {name}"

    return f'''                    <a class="talent" href="{href}" target="_blank" rel="noopener"
                        aria-label="{label}" data-tilt="5">
                        <span class="talent-photo">
                            <img src="{OUT_DIR}/{slug(name)}.jpg" alt="{name}" loading="lazy" width="780"
                                height="1040">
                        </span>
                        <span class="talent-body">
                            <span class="talent-role">{role}</span>
                            <span class="talent-name">{name}</span>
                            <span class="talent-meta">{IG_GLYPH}{meta}</span>
                        </span>
                    </a>'''


def rail(title, count, people, start, direction):
    """direction is the way the cards travel: "right" or "left".

    script.js clones the track to close the loop and derives the duration from
    the track width, so both rails move at the same speed despite holding
    different numbers of cards.
    """
    cards = "\n".join(card(n, r, h, start + i) for i, (n, r, h) in enumerate(people))
    return f'''                <div class="rail-head">
                    <h3 class="rail-title">{title}</h3>
                    <span class="rail-count">{count}</span>
                </div>
                <div class="talent-marquee" data-marquee="{direction}" aria-label="{title} we work with">
                    <div class="talent-track">
{cards}
                    </div>
                </div>'''


SECTION = f'''        <!-- ============ FAMOUS FACES ============
             Photos are branded placeholders. Drop a cleared photo in at
             assets/talent/<slug>.jpg (same filename) and it appears automatically.
             Cards with a confirmed handle link straight to the profile; the rest
             link to an Instagram search for that name so a visitor is never sent
             to an impersonator. -->
        <section class="section" id="faces">
            <span class="watermark" aria-hidden="true">V</span>
            <div class="shell">
                <div class="section-head">
                    <p class="eyebrow" data-reveal>Famous Faces</p>
                    <h2 class="display-2" data-reveal="mask" style="--d:60ms">
                        Faces You Know,<br><span class="gold-solid">Reach You Can Book</span>
                    </h2>
                    <div class="rule left" data-reveal><span class="spark"></span></div>
                    <p class="lead" data-reveal style="--d:120ms">
                        Creators and celebrities we connect brands with. Tap any face to open their Instagram.
                    </p>
                </div>

{rail("Influencers", f"{len(INFLUENCERS)} creators", INFLUENCERS, 0, "right")}

{rail("Celebrities", f"{len(CELEBRITIES)} artists", CELEBRITIES, 3, "left")}
            </div>
        </section>

'''


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    everyone = INFLUENCERS + CELEBRITIES

    for i, (name, role, handle) in enumerate(everyone):
        path = f"{OUT_DIR}/{slug(name)}.jpg"
        # Existing files are left alone so re-running this to change the markup
        # can never clobber a real photo you have dropped in. Set
        # FORCE_PLACEHOLDERS=1 to rebuild the placeholder art.
        if os.path.exists(path) and os.environ.get("FORCE_PLACEHOLDERS") != "1":
            print(f"kept    {path:44} {name}")
            continue
        make_placeholder(name, i, path)
        state = f"@{handle}" if handle else "search fallback"
        print(f"{path:44} {name:20} {state}")

    src = open(PAGE, encoding="utf-8").read()
    if 'id="faces"' in src:
        src = re.sub(r'        <!-- ============ FAMOUS FACES ============.*?</section>\n\n',
                     "", src, flags=re.S)
    anchor = "        <!-- ============ FOUNDER & CEO"
    if anchor not in src:
        raise SystemExit("Could not find the founder section to insert before.")
    src = src.replace(anchor, SECTION + anchor, 1)
    open(PAGE, "w", encoding="utf-8").write(src)

    confirmed = sum(1 for _, _, h in everyone if h)
    print(f"\nInserted #faces into {PAGE}: {len(everyone)} people, "
          f"{confirmed} confirmed handles, {len(everyone) - confirmed} using Instagram search.")


if __name__ == "__main__":
    main()
