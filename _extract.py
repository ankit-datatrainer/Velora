"""Extract embedded images from the Velora deck.

NOTE ON FILE EXTENSIONS
-----------------------
The first version of this script wrote every embedded image to "*.png" no matter
what bytes the PDF actually held. PDFs store images in their native encoding, so
photographs came out as JPEG data behind a .png filename. Anything that trusts
the extension instead of sniffing the bytes then reports a media-type mismatch
("specified as image/png, but the image appears to be image/jpeg").

So: always name the file after the format Pillow actually decodes, never after
the format you assumed.
"""
import os
import pypdf
from PIL import Image
import io

EXT = {"JPEG": ".jpg", "PNG": ".png", "GIF": ".gif", "WEBP": ".webp", "TIFF": ".tif"}

os.makedirs("_pdfimg", exist_ok=True)
reader = pypdf.PdfReader("Velora Presentation 1.pdf")

for i, page in enumerate(reader.pages):
    for j, embedded in enumerate(page.images):
        data = embedded.data
        with Image.open(io.BytesIO(data)) as probe:
            fmt, size, mode = probe.format, probe.size, probe.mode
        out = f"_pdfimg/p{i + 1}_{j}{EXT.get(fmt, '.bin')}"
        with open(out, "wb") as f:
            f.write(data)
        print(f"{out:24} {fmt:5} {size[0]}x{size[1]} {mode}")
