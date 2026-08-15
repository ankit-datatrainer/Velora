"""Repair image files whose extension does not match their real format.

_extract.py wrote every embedded PDF image as "*.png" regardless of the bytes it
pulled out, so several files are actually JPEG data sitting behind a .png name.
Anything that sniffs the format from the extension (browsers are lenient, most
APIs are not) then reports a media-type mismatch. This renames each file to the
extension its magic bytes actually claim.
"""
import os
import glob
from PIL import Image

EXT = {"JPEG": ".jpg", "PNG": ".png", "GIF": ".gif", "WEBP": ".webp", "TIFF": ".tif"}

for path in sorted(glob.glob("_pdfimg/*") + glob.glob("_shots/*") + glob.glob("assets/**/*", recursive=True)):
    if not os.path.isfile(path):
        continue
    try:
        with Image.open(path) as im:
            real = EXT.get(im.format)
            size = im.size
    except Exception:
        continue                      # not an image (e.g. showreel.mp4)
    have = os.path.splitext(path)[1].lower()
    if real and real != have:
        new = os.path.splitext(path)[0] + real
        os.replace(path, new)
        print(f"RENAMED {path} -> {new}   (real format, {size[0]}x{size[1]})")
    else:
        print(f"ok      {path}   {size[0]}x{size[1]}")
