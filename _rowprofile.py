"""Row luminance profiles, to separate true black canvas from dark photograph."""
import numpy as np
from PIL import Image

for name in ("p4_1", "p4_2", "p4_3", "p4_4", "p4_5", "p4_7"):
    a = np.asarray(Image.open(f"_pdfimg/{name}.jpg").convert("L"), dtype=np.uint8)
    h, w = a.shape
    means = a.mean(axis=1)
    print(f"\n=== {name} {w}x{h}   row-mean min={means.min():.1f} max={means.max():.1f}")
    # Where does mean cross a few candidate canvas thresholds?
    for t in (1, 3, 6, 12):
        canvas = means < t
        print(f"   canvas(mean<{t:2d}): {canvas.sum():4d}/{h} rows "
              f"({canvas.sum() / h * 100:4.1f}%)")
    step = max(1, h // 42)
    for y in range(0, h, step):
        print(f"     y={y:4d} mean={means[y]:6.1f} {'#' * int(min(means[y], 200) / 5)}")
