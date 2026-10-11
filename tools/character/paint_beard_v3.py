# Paints the Italian beard into a copy of the face texture: a clean-edged mask from the per-vertex
# beard weights, a dark-brown base and thousands of short strokes that follow the hair's growth
# direction (down on the cheeks and chin, down-and-out on the moustache), plus sparse strokes at the
# edges so the beard fades into the skin rather than ending in a hard outline.
#
#   python paint_beard_v3.py <face texture> <beard_uv.json> <out.webp> [size=2048]
import json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src, uvjson, out = sys.argv[1:4]
S = int(sys.argv[4]) if len(sys.argv) > 4 else 2048
base = Image.open(src).convert("RGB").resize((S, S), Image.LANCZOS)

data = json.load(open(uvjson))
MOUTH = np.array(data["mouth"], np.float32)


def ss(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def beard_weight(px, py, pz):
    # same shape as beard_top / beard_weight in build_character_v3.py, per pixel
    ax = np.abs(px)
    moustache = np.where(ax < 0.7, 0.875 - 0.07 * ss(0.2, 0.45, ax) - 0.30 * ss(0.45, 0.68, ax), 0.0)
    cheek = 0.50 + 0.56 * ss(0.70, 0.98, ax)
    top = np.maximum(moustache, cheek)
    w = 1 - ss(top - 0.03, top + 0.012, py)
    d = np.sqrt(((np.stack([px, py, pz], -1)[..., None, :] - MOUTH) ** 2).sum(-1)).min(-1)
    w *= ss(0.02, 0.05, d)
    w *= 1 - ss(1.12, 1.18, pz) * ss(0.8, 0.9, py)
    w *= ss(-0.12, 0.02, py)
    w *= ss(-0.15, 0.15, pz)
    return w


mask = np.zeros((S, S), np.float32)
dirs = np.zeros((S, S, 2), np.float32)
for tri in data["tris"]:
    pts = np.array([[t[0] * S, t[1] * S] for t in tri[:3]], np.float32)
    P = np.array([t[2:5] for t in tri[:3]], np.float32)
    x0, y0 = np.maximum(np.floor(pts.min(0)).astype(int), 0)
    x1, y1 = np.minimum(np.ceil(pts.max(0)).astype(int), S - 1)
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
    inside = (l1 >= -0.02) & (l2 >= -0.02) & (l3 >= -0.02)
    if not inside.any():
        continue
    p = l1[..., None] * P[0] + l2[..., None] * P[1] + l3[..., None] * P[2]
    val = np.where(inside, beard_weight(p[..., 0], p[..., 1], p[..., 2]), 0)
    region = mask[y0:y1 + 1, x0:x1 + 1]
    upd = val > region
    region[upd] = val[upd]
    dirs[y0:y1 + 1, x0:x1 + 1][upd & inside] = np.array(tri[3], np.float32)

# Clean edges: a light blur only, then a steep curve so the cheek line stays crisp.
a = np.asarray(Image.fromarray((np.clip(mask, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(S / 1024)),
               np.float32) / 255.0
a = np.clip((a - 0.08) / 0.62, 0, 1)
a = a * a * (3 - 2 * a)

rng = np.random.default_rng(11)
base_col = np.array([60, 42, 30], np.float32)  # dark brown (sRGB); reads near black under the scene light
img = np.asarray(base, np.float32)
beard = np.broadcast_to(base_col, img.shape).copy()

# Strands on their own layer: lighter and darker strokes along the growth direction.
strands = Image.new("RGBA", (S, S), (0, 0, 0, 0))
draw = ImageDraw.Draw(strands, "RGBA")
ys, xs = np.nonzero(a > 0.05)
n = int(len(xs) * 0.06)
pick = rng.integers(0, len(xs), n)
scale = S / 2048
for k in pick:
    x, y = xs[k], ys[k]
    cov = a[y, x]
    if cov < 0.95 and rng.random() > cov * 1.4:  # thinner near the edge
        continue
    d = dirs[y, x]
    if not d.any():
        continue
    ang = np.arctan2(d[1], d[0]) + rng.normal(0, 0.22)
    length = rng.uniform(7, 16) * scale * (0.7 + 0.3 * cov)
    dx, dy = np.cos(ang) * length, np.sin(ang) * length
    tone = rng.random()
    if tone < 0.55:
        col = (24, 16, 11, int(160 * cov))         # shadow strands
    elif tone < 0.86:
        col = (96, 68, 48, int(150 * cov))         # mid brown
    else:
        col = (138, 102, 74, int(125 * cov))       # sparse highlights
    draw.line([(x - dx / 2, y - dy / 2), (x + dx / 2, y + dy / 2)], fill=col, width=max(1, int(round(1.4 * scale))))
st = np.asarray(strands, np.float32)
sa = st[..., 3:4] / 255.0
beard = beard * (1 - sa) + st[..., :3] * sa

# Edge stubble: short dark flecks just outside and along the mask edge, so it fades into skin.
edge = np.clip(a * (1 - a) * 4, 0, 1)
ey, ex = np.nonzero(edge > 0.15)
fleck = Image.new("RGBA", (S, S), (0, 0, 0, 0))
fd = ImageDraw.Draw(fleck, "RGBA")
for k in rng.integers(0, len(ex), int(len(ex) * 0.04)):
    x, y = ex[k], ey[k]
    d = dirs[y, x]
    ang = np.arctan2(d[1], d[0]) + rng.normal(0, 0.3) if d.any() else rng.uniform(0, np.pi)
    length = rng.uniform(3, 7) * scale
    fd.line([(x, y), (x + np.cos(ang) * length, y + np.sin(ang) * length)], fill=(28, 19, 13, 140),
            width=max(1, int(round(scale))))
fl = np.asarray(fleck, np.float32)
fa = fl[..., 3:4] / 255.0 * (1 - a[..., None])

result = img * (1 - a[..., None]) + beard * a[..., None]
result = result * (1 - fa) + fl[..., :3] * fa
Image.fromarray(result.clip(0, 255).astype(np.uint8)).save(out, "WEBP", quality=80, method=6)
print("painted %dx%d; beard coverage %.1f%%; strands %d" % (S, S, 100 * (a > 0.5).mean(), n))
