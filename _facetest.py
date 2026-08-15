"""Confirm YuNet locates the faces, and at what upscale, before wiring it into the polish pass."""
import cv2
import numpy as np
from PIL import Image

SRC = [f"_pdfimg/p4_{i}.jpg" for i in range(1, 8)]
MODEL = "_models/yunet.onnx"


def trim_black(im, thresh=26):
    a = np.asarray(im.convert("L"), dtype=np.uint8)
    rows = np.where(a.max(axis=1) > thresh)[0]
    cols = np.where(a.max(axis=0) > thresh)[0]
    if not len(rows) or not len(cols):
        return im
    return im.crop((int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1))


for path in SRC:
    im = trim_black(Image.open(path))
    bgr = cv2.cvtColor(np.asarray(im.convert("RGB")), cv2.COLOR_RGB2BGR)
    print(f"\n=== {path}  content {im.size[0]}x{im.size[1]}")
    for up in (1, 2, 3):
        img = cv2.resize(bgr, None, fx=up, fy=up, interpolation=cv2.INTER_CUBIC) if up > 1 else bgr
        h, w = img.shape[:2]
        for conf in (0.5, 0.3, 0.15):
            det = cv2.FaceDetectorYN_create(MODEL, "", (w, h), conf, 0.3, 5000)
            _, faces = det.detect(img)
            if faces is None:
                continue
            boxes = [(int(f[0] / up), int(f[1] / up), int(f[2] / up), int(f[3] / up), round(float(f[-1]), 2))
                     for f in faces]
            print(f"  up={up} conf={conf}: {len(boxes)} -> {boxes}")
            break
