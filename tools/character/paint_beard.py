# Paints a soft-edged short beard into a copy of the face texture using per-vertex beard weights over the
# face mesh's UV triangles (exported by tier2b.py). Usage: paint_beard.py base.png beard_uv.json out.webp
import json, sys
import numpy as np
from PIL import Image, ImageFilter

base = Image.open(sys.argv[1]).convert("RGB")
W, H = base.size
tris = json.load(open(sys.argv[2]))["tris"]
mask = np.zeros((H, W), np.float32)

for tri in tris:
    w = np.array([t[2] for t in tri], np.float32)
    if w.max() <= 0.001:
        continue
    pts = np.array([[t[0] * W, t[1] * H] for t in tri], np.float32)
    x0, y0 = np.floor(pts.min(0)).astype(int)
    x1, y1 = np.ceil(pts.max(0)).astype(int)
    x0, y0 = max(x0, 0), max(y0, 0)
    x1, y1 = min(x1, W - 1), min(y1, H - 1)
    if x1 < x0 or y1 < y0:
        continue
    xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    (ax, ay), (bx, by), (cx, cy) = pts
    det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if abs(det) < 1e-9:
        continue
    l1 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / det
    l2 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / det
    l3 = 1 - l1 - l2
    inside = (l1 >= -0.02) & (l2 >= -0.02) & (l3 >= -0.02)  # small overlap avoids hairline cracks
    val = l1 * w[0] + l2 * w[1] + l3 * w[2]
    region = mask[y0:y1 + 1, x0:x1 + 1]
    np.maximum(region, np.where(inside, val, 0), out=region)

alpha = Image.fromarray((np.clip(mask, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.5))
a = np.asarray(alpha, np.float32) / 255.0
a = np.clip(a * 1.15, 0, 1) ** 0.85 * 0.96

rng = np.random.default_rng(7)
grain = rng.normal(0, 1, (H, W)).astype(np.float32)
grain = np.asarray(Image.fromarray(((grain * 0.5 + 0.5).clip(0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), np.float32) / 255.0
beard = np.array([30, 23, 19], np.float32)[None, None, :] * (0.75 + 0.5 * grain[..., None])

img = np.asarray(base, np.float32)
out = img * (1 - a[..., None]) + beard * a[..., None]
Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(sys.argv[3], "WEBP", quality=88, method=6)
Image.fromarray((a * 255).astype(np.uint8)).save(sys.argv[3].replace(".webp", "-mask.png"))
print("painted; beard coverage %.1f%% of texture" % (100 * (a > 0.5).mean()))
