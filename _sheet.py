"""Contact sheet of the polished output so the crops can be eyeballed in one pass."""
import glob
import os
from PIL import Image, ImageDraw

rows = [
    ("polished glimpses (4:5)", sorted(glob.glob("assets/gallery/glimpse-*.jpg"))),
    ("celebrity face crops (1:1)", sorted(glob.glob("assets/faces/face-*.jpg"))),
]
CELL, PAD, COLS = 260, 20, 7
sheet_h = PAD + sum(CELL + PAD + 40 for _, _ in rows)
sheet = Image.new("RGB", (COLS * (CELL + PAD) + PAD, sheet_h), (12, 16, 38))
d = ImageDraw.Draw(sheet)

y = PAD
for label, files in rows:
    d.text((PAD, y), label.upper(), fill=(240, 210, 130))
    y += 18
    for i, f in enumerate(files):
        with Image.open(f) as im:
            im = im.convert("RGB")
            im.thumbnail((CELL, CELL))
            x = PAD + i * (CELL + PAD)
            sheet.paste(im, (x + (CELL - im.width) // 2, y))
            d.text((x, y + CELL + 4), os.path.basename(f), fill=(200, 208, 235))
    y += CELL + PAD + 22

sheet.save("_sheet.png")
print("_sheet.png", sheet.size)
