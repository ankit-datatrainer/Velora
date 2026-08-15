"""VELORA photo polish.

The source photos are phone shots that were pasted onto black canvases inside the
deck, so every one of them arrives with letterbox bars, and some still carry iOS
status bars, home indicators and Instagram carousel chevrons. Shown raw they look
like screenshots rather than campaign photography.

This pass, per photo:
  1. trims the near-black letterbox down to real content
  2. finds the faces with a Haar cascade
  3. crops a 4:5 portrait that seats the faces on the upper third, which also
     lands inside the phone chrome and removes it
  4. crops a tight square on the faces for the celebrity-face rail
  5. grades it brighter and warmer to match the gold/navy brand, then sharpens

It writes assets/gallery/glimpse-N.jpg, assets/faces/face-N.jpg, and prints the
vertical face centre of each portrait so the HTML can set object-position and
never cut a head off in a wide crop.
"""
import json
import os

import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

os.environ.setdefault("OPENCV_LOG_LEVEL", "ERROR")

SRC = [f"_pdfimg/p4_{i}.jpg" for i in range(1, 8)]
# OpenCV 5 ships no haarcascade XMLs (cv2/data is empty), and Haar missed every
# one of these subjects anyway — they are small in frame and several wear
# sunglasses. YuNet finds both people in all seven photos at 0.9+ confidence.
MODEL = "_models/yunet.onnx"
DETECT_UPSCALE = 2
MIN_CONF = 0.80
MIN_REL_AREA = 0.20          # drop tiny background bystanders
GALLERY_DIR = "assets/gallery"
FACES_DIR = "assets/faces"
PORTRAIT = (4, 5)
GAL_W = 1100
FACE_W = 860


# ---------------------------------------------------------------- black borders
def _longest_run(mask, max_gap=10):
    """Start/end of the longest mostly-contiguous stretch of True in mask.

    Taking the first and last lit row is not enough. These frames carry a bright
    iOS home indicator hundreds of pixels below the photo and a dim Instagram
    chevron in between, so first/last spans the whole screenshot. The photo is
    always the single longest run, so that is what we keep.
    """
    best = cur_start = None
    best_len = 0
    i = 0
    n = len(mask)
    while i < n:
        if not mask[i]:
            i += 1
            continue
        cur_start = i
        end = i
        j = i
        while j < n:
            if mask[j]:
                end = j
                j += 1
            else:
                gap = 0
                while j + gap < n and not mask[j + gap]:
                    gap += 1
                if gap > max_gap:
                    break
                j += gap
        if end - cur_start + 1 > best_len:
            best_len = end - cur_start + 1
            best = (cur_start, end + 1)
        i = max(end + 1, i + 1)
    return best


CANVAS_MEAN = 3.0     # deck canvas rows measure 0.0-2.4; the darkest real photo row is 3.5


def trim_black(im):
    """Reduce the frame to the photograph, dropping black canvas and phone chrome.

    A row counts as canvas when its mean luminance is below CANVAS_MEAN. That
    number is not arbitrary: profiling the sources showed canvas rows at mean
    0.0-2.4 (including the dim Instagram chevron band) while the darkest row of
    the darkest real photograph is 3.5, so the two never overlap. Photos with no
    letterbox at all therefore come through untouched.

    Rows are resolved first, then columns within that band, so the long black
    region below a photo cannot drag the column statistics down.
    """
    a = np.asarray(im.convert("L"), dtype=np.float32)
    rspan = _longest_run(a.mean(axis=1) >= CANVAS_MEAN)
    if not rspan:
        return im, (0, 0)
    top, bottom = rspan
    band = a[top:bottom]
    cspan = _longest_run(band.mean(axis=0) >= CANVAS_MEAN)
    if not cspan:
        return im.crop((0, top, im.size[0], bottom)), (0, top)
    left, right = cspan
    return im.crop((left, top, right, bottom)), (left, top)


def signature(path, size=16):
    """Coarse grayscale fingerprint, enough to spot the same photo at two sizes."""
    with Image.open(path) as im:
        content, _ = trim_black(im)
        small = content.convert("L").resize((size, size), Image.LANCZOS)
    a = np.asarray(small, dtype=np.float32)
    return (a > a.mean()).flatten()


def dedupe(paths, max_hamming=18):
    """Keep the highest-resolution copy of each distinct photo."""
    entries = []
    for p in paths:
        with Image.open(p) as im:
            px = im.size[0] * im.size[1]
        entries.append((p, px, signature(p)))
    entries.sort(key=lambda e: -e[1])

    kept, dropped = [], []
    for p, px, sig in entries:
        twin = next((kp for kp, _, ks in kept if int(np.count_nonzero(sig != ks)) <= max_hamming), None)
        if twin:
            dropped.append((p, twin))
        else:
            kept.append((p, px, sig))
    for p, twin in dropped:
        print(f"skipped {p}: duplicate of {twin} at lower resolution")
    return [p for p, _, _ in sorted(kept, key=lambda e: paths.index(e[0]))]


# ------------------------------------------------------------------------ faces
def find_faces(im):
    """Faces YuNet is confident about, with tiny background bystanders dropped."""
    bgr = cv2.cvtColor(np.asarray(im.convert("RGB")), cv2.COLOR_RGB2BGR)
    up = DETECT_UPSCALE
    big = cv2.resize(bgr, None, fx=up, fy=up, interpolation=cv2.INTER_CUBIC)
    h, w = big.shape[:2]
    det = cv2.FaceDetectorYN_create(MODEL, "", (w, h), MIN_CONF, 0.3, 5000)
    _, faces = det.detect(big)
    if faces is None:
        return []

    boxes = []
    for f in faces:
        x, y, bw, bh = (int(round(v / up)) for v in f[:4])
        boxes.append((max(0, x), max(0, y), bw, bh, float(f[-1])))
    if not boxes:
        return []

    biggest = max(b[2] * b[3] for b in boxes)
    return [b[:4] for b in boxes if (b[2] * b[3]) / biggest >= MIN_REL_AREA]


def face_union(faces, size):
    """Bounding box of all faces, or a sensible upper-centre guess if none found."""
    w, h = size
    if not faces:
        return (int(w * 0.22), int(h * 0.14), int(w * 0.56), int(h * 0.26))
    x0 = min(f[0] for f in faces)
    y0 = min(f[1] for f in faces)
    x1 = max(f[0] + f[2] for f in faces)
    y1 = max(f[1] + f[3] for f in faces)
    return (x0, y0, x1 - x0, y1 - y0)


# ------------------------------------------------------------------------ crops
def crop_aspect(im, ratio, focus_y, focus_x=0.5, zoom=1.0):
    """Largest ratio-correct window we can take, centred on a focal point."""
    w, h = im.size
    rw, rh = ratio
    cw = min(w, int(h * rw / rh))
    ch = min(h, int(cw * rh / rw))
    cw, ch = int(cw / zoom), int(ch / zoom)
    cw, ch = min(cw, w), min(ch, h)
    left = int(round(focus_x * w - cw / 2))
    top = int(round(focus_y * h - ch / 2))
    left = max(0, min(left, w - cw))
    top = max(0, min(top, h - ch))
    return im.crop((left, top, left + cw, top + ch)), (left, top, cw, ch)


def square_on_faces(im, box, pad=1.55):
    """Tight square around the faces, padded out to include shoulders."""
    w, h = im.size
    fx, fy, fw, fh = box
    cx, cy = fx + fw / 2, fy + fh / 2
    side = int(min(max(fw, fh) * pad, min(w, h)))
    left = max(0, min(int(cx - side / 2), w - side))
    top = max(0, min(int(cy - side / 2 - side * 0.06), h - side))
    return im.crop((left, top, left + side, top + side))


# ------------------------------------------------------------------------ grade
def polish(im, target_w):
    """Brighten, warm slightly toward the brand gold, then resize and sharpen."""
    im = im.convert("RGB")
    im = ImageOps.autocontrast(im, cutoff=(0.6, 0.4))
    im = ImageEnhance.Brightness(im).enhance(1.11)
    im = ImageEnhance.Contrast(im).enhance(1.06)
    im = ImageEnhance.Color(im).enhance(1.13)

    # Gentle warm bias: lift red, hold green, ease blue back.
    r, g, b = im.split()
    r = r.point(lambda v: min(255, int(v * 1.035 + 3)))
    b = b.point(lambda v: max(0, int(v * 0.975)))
    im = Image.merge("RGB", (r, g, b))

    w, h = im.size
    scale = min(target_w / w, 1.85)          # never over-upscale into mush
    if scale != 1:
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    return im.filter(ImageFilter.UnsharpMask(radius=1.5, percent=112, threshold=3))


# ------------------------------------------------------------------------- main
os.makedirs(GALLERY_DIR, exist_ok=True)
os.makedirs(FACES_DIR, exist_ok=True)
report = []

sources = dedupe(SRC)
print(f"{len(sources)} distinct photos of {len(SRC)} extracted\n")

for n, path in enumerate(sources, start=1):
    raw = Image.open(path)
    content, _ = trim_black(raw)
    faces = find_faces(content)
    fx, fy, fw, fh = face_union(faces, content.size)
    cw, ch = content.size

    # Seat the faces about a third of the way down the portrait crop.
    face_cy = (fy + fh / 2) / ch
    focus_y = min(max(face_cy + 0.16, 0.0), 1.0)
    focus_x = min(max((fx + fw / 2) / cw, 0.28), 0.72)

    portrait, (pl, pt, pw, ph) = crop_aspect(content, PORTRAIT, focus_y, focus_x)
    gal = polish(portrait, GAL_W)
    gal_path = f"{GALLERY_DIR}/glimpse-{n}.jpg"
    gal.save(gal_path, "JPEG", quality=88, optimize=True, progressive=True)

    # Where the faces ended up inside the portrait, as a CSS object-position %.
    face_pct = round(max(6.0, min(94.0, ((fy + fh / 2) - pt) / ph * 100)), 1)

    sq = polish(square_on_faces(content, (fx, fy, fw, fh)), FACE_W)
    face_path = f"{FACES_DIR}/face-{n}.jpg"
    sq.save(face_path, "JPEG", quality=90, optimize=True, progressive=True)

    trimmed = (1 - (cw * ch) / (raw.size[0] * raw.size[1])) * 100
    report.append({
        "n": n, "src": path, "faces": len(faces),
        "glimpse": [gal.size[0], gal.size[1]], "face": [sq.size[0], sq.size[1]],
        "object_position_y": face_pct,
    })
    print(f"glimpse-{n}: {len(faces)} face(s)  "
          f"raw {raw.size[0]}x{raw.size[1]} -> content {cw}x{ch} "
          f"({trimmed:4.1f}% black trimmed) -> gallery {gal.size[0]}x{gal.size[1]}"
          f", face {sq.size[0]}x{sq.size[1]}, object-position-y {face_pct}%")
    raw.close()

if any(r["faces"] == 0 for r in report):
    raise SystemExit("Face detection failed on at least one photo — crops would be guesses.")

# Clear leftovers from the previous set. glimpse-8/9 were the deck's "THANK YOU"
# slide, which the homepage was presenting as event photography.
import glob as _glob

for pattern, keep in ((f"{GALLERY_DIR}/glimpse-*.jpg", "glimpse"), (f"{FACES_DIR}/face-*.jpg", "face")):
    for f in sorted(_glob.glob(pattern)):
        num = int(os.path.splitext(os.path.basename(f))[0].split("-")[1])
        if num > len(report):
            os.remove(f)
            print(f"removed {f} (no longer part of the set)")

with open("_polish.json", "w", encoding="utf-8") as f:
    json.dump(report, f, indent=2)
print(f"\n{len(report)} photos polished. object-position values written to _polish.json")
