# Character v3: textured quiff, Italian beard (painted weights + a thin shell for volume) and an
# open overshirt layered over the original sweatshirt. The original model is only read.
#
#   blender --background --factory-startup --python build_character_v3.py -- <character.glb> <outdir> [render]
#
# Outputs (outdir):
#   character-hair.glb   scalp cover + ~120 tapered hair clumps, in the model's bind space
#   beard-shell.glb      face faces inside the beard, lifted along their normals (vertex colour = edge mask)
#   overshirt.glb        open overshirt (body, placket and collar), in the model's bind space
#   beard_uv.json        per-triangle UVs, beard weight and strand direction, for paint_beard_v3.py
# At runtime the hair and beard shell are rigidly skinned to the head bone and the overshirt takes its
# skin weights from the nearest vertex of the original shirt (see appearance.ts).
import bpy, bmesh, os, math, sys, json, random
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:]
MODEL, OUT = argv[0], argv[1]
RENDER = "render" in argv
os.makedirs(OUT, exist_ok=True)
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=MODEL)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
arm.data.pose_position = "REST"
bpy.context.view_layer.update()
M = arm.matrix_world @ arm.data.bones["spine.006"].matrix_local  # head frame: +Y up the head, +Z to the face
Minv = M.inverted()


def ss(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def new_obj(name, me):
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    return o


def material(name, rgb, rough, vertex_colors=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    m.diffuse_color = (*rgb, 1)
    if vertex_colors:
        # The glTF exporter writes COLOR_0 only when a material node reads the attribute.
        vc = m.node_tree.nodes.new("ShaderNodeVertexColor")
        vc.layer_name = "Col"
        m.node_tree.links.new(vc.outputs["Color"], b.inputs["Base Color"])
        m.node_tree.links.new(vc.outputs["Alpha"], b.inputs["Alpha"])
    return m


def export(objs, path, colors=False, uvs=False):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True,
                              export_animations=False, export_skins=False, export_morph=False,
                              export_texcoords=uvs, export_normals=True, export_colors=colors,
                              export_apply=True)
    print("EXPORTED", os.path.basename(path), sum(len(o.data.vertices) for o in objs), "verts")


# ═══ Hair ═════════════════════════════════════════════════════════════════════════
# Scalp cover: the previous dome's hairline, but close to the head (the clumps give the volume).
C = Vector((0.0, 1.72, 0.06))
R = Vector((1.04, 1.02, 1.10))


def hairline(p):
    # front edge sits just over the original hair band so the quiff's first row can root on it
    return 1.25 + 0.49 * ss(-0.2, 0.65, p.z) - 0.30 * ss(0.62, 0.92, abs(p.x)) * ss(-0.1, 0.55, p.z)


bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=72, v_segments=44, radius=1.0)
for v in bm.verts:
    v.co = Vector((C.x + v.co.x * R.x, C.y + v.co.z * R.y, C.z + v.co.y * R.z))
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < hairline(v.co)], context="VERTS")
edge = [v for v in bm.verts if v.is_boundary]
for _ in range(25):
    bmesh.ops.smooth_vert(bm, verts=edge, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
bm.normal_update()
for v in bm.verts:
    p, n = v.co.copy(), v.normal.copy()
    sides = 0.02 * ss(0.7, 1.0, abs(p.x))  # just outside the original side/back hair band
    quiff = 0.20 * math.exp(-((p.z - 0.62) ** 2) / 0.16 - (p.x ** 2) / 0.35) * ss(1.95, 2.45, p.y)
    crown = 0.06 * ss(1.95, 2.5, p.y)
    v.co = p + n * (0.025 + sides + quiff + crown)
    v.co.z -= 0.05 * ss(0.4, 1.0, v.co.z) * (1 - ss(2.1, 2.5, v.co.y))
scalp_me = bpy.data.meshes.new("HairScalp")
bm.to_mesh(scalp_me)
bm.free()
scalp = new_obj("HairScalp", scalp_me)
sol = scalp.modifiers.new("sol", "SOLIDIFY")
sol.thickness = 0.05
sol.offset = -1.0
bpy.context.view_layer.objects.active = scalp
bpy.ops.object.modifier_apply(modifier="sol")
bvh_scalp = BVHTree.FromObject(scalp, bpy.context.evaluated_depsgraph_get())

# Clumps: tapered, slightly flattened locks swept up and back, highest at the front (the quiff),
# short over the crown and absent on the sides (the side band is the short sides).
SEG, RING = 6, 5
hm = bpy.data.meshes.new("HairClumps")
hb = bmesh.new()
verts_color = []  # per-vertex colour, applied after to_mesh


def surface(p):
    loc, nrm, _, _ = bvh_scalp.find_nearest(p)
    return loc, nrm


def add_clump(loc, nrm, direction, length, lift, width, thick, tone, curl, base, rise):
    # rise blends the lift direction from the scalp normal towards head-up (the quiff stands up)
    up = nrm.normalized()
    lift_dir = up.lerp(Vector((0, 1, 0)), rise).normalized()
    d = (direction - up * direction.dot(up)).normalized()
    side_vec = d.cross(up).normalized()  # one frame per clump: rings never twist into spikes
    pts = []
    for i in range(SEG + 1):
        t = i / SEG
        p = loc + d * (length * t)
        p = p + up * base + lift_dir * (lift * math.sin(math.pi * min(1.0, t * 0.9 + 0.05)) * (1 - 0.35 * t))
        p = p + lift_dir * (curl * t * t)  # tips flick up (front) or lie down (crown)
        sl, sn = surface(p)
        floor = 0.035 + 0.03 * (1 - t)
        if (p - sl).dot(sn) < floor:  # never sink into the scalp
            p = sl + sn * floor
        pts.append(p)
    pts[0] = loc - up * 0.015  # root buried slightly: no gap at the base
    ring_prev = None
    for i, p in enumerate(pts):
        t = i / SEG
        tan = (pts[min(i + 1, SEG)] - pts[max(i - 1, 0)]).normalized()
        n = side_vec.cross(tan).normalized()
        b = tan.cross(n).normalized()
        taper = (1 - t) ** 1.15
        w, h = width * (0.35 + 0.65 * taper), thick * (0.3 + 0.7 * taper)
        if i == SEG:
            tip = hb.verts.new(p)
            verts_color.append((tip, tone * 1.35))
            for k in range(RING):
                hb.faces.new((ring_prev[k], ring_prev[(k + 1) % RING], tip))
            break
        ring = []
        for k in range(RING):
            a = 2 * math.pi * k / RING
            q = p + b * (math.cos(a) * w * 0.5) + n * (math.sin(a) * h * 0.5)
            v = hb.verts.new(q)
            verts_color.append((v, tone * lerp(0.8, 1.3, t)))
            ring.append(v)
        if ring_prev:
            for k in range(RING):
                hb.faces.new((ring_prev[k], ring_prev[(k + 1) % RING], ring[(k + 1) % RING], ring[k]))
        ring_prev = ring


BASE = Vector((0.032, 0.021, 0.0145))  # linear dark brown, near black
n_clumps = 0
roots = []
for row in range(21):
    zf = 0.95 - row * 0.078  # from the front hairline towards the crown
    for cidx in range(11):
        xf = -0.9 + 1.8 * (cidx + 0.5) / 11 + random.uniform(-0.05, 0.05) + (0.04 if row % 2 else -0.04)
        z = C.z + zf + random.uniform(-0.035, 0.035)
        hit, nrm, _, _ = bvh_scalp.ray_cast(Vector((xf, 6.0, z)), Vector((0, -1, 0)))
        if hit is None or hit.y < 2.0 - 0.15 * ss(0.0, -0.6, zf) or nrm.z > 0.55:
            continue  # off the top (sides are the original short band; the brow slope gets the quiff row)
        roots.append((hit, nrm, xf, zf))
for hit, nrm, xf, zf in roots:
    front = ss(0.05, 0.85, zf)  # 1 at the forehead, 0 at the crown
    side = ss(0.45, 0.85, abs(xf))
    direction = Vector((xf * (0.35 + 0.5 * side) + random.uniform(-0.25, 0.25),
                        0.12 * front, -1.0))
    length = random.uniform(0.55, 0.8) * lerp(1.0, 1.15, front) * (1 - 0.35 * side)
    lift = (0.05 + 0.16 * front ** 1.3) * (1 - 0.7 * side) * random.uniform(0.8, 1.2)
    base = (0.03 + 0.04 * front) * (1 - 0.45 * side)
    curl = (0.05 * front - 0.04 * (1 - front)) * (1 - side) * random.uniform(0.5, 1.3)
    width = random.uniform(0.22, 0.32) * (1 - 0.2 * side)
    thick = random.uniform(0.06, 0.085) * (1 - 0.3 * side)
    tone = BASE * random.uniform(0.7, 1.5)
    add_clump(hit, nrm, direction, length, lift, width, thick, tone, curl, base, 0.35 * front)
    n_clumps += 1
# The quiff: two staggered rows of locks rooted along the front hairline, rising off the forehead and
# sweeping up and back over the clumps behind them.
for row, (y0, count) in enumerate(((1.77, 11), (1.88, 10), (1.99, 9), (2.12, 8))):
    for k in range(count):
        xf = -0.54 + 1.08 * (k + 0.5) / count + random.uniform(-0.04, 0.04)
        hit, nrm, _, _ = bvh_scalp.ray_cast(Vector((xf, y0 + random.uniform(-0.03, 0.03), 6.0)), Vector((0, 0, -1)))
        if hit is None or abs(nrm.x) > 0.55:
            continue  # the steep sides of the forehead would push a lock out sideways
        side = ss(0.35, 0.7, abs(xf))
        direction = Vector((xf * 0.35 + random.uniform(-0.12, 0.12), 1.0, -0.4 - 0.22 * row))
        add_clump(hit, nrm, direction, random.uniform(0.62, 0.85) * (1 - 0.25 * side),
                  (0.08 + 0.08 * (1 - side)) * random.uniform(0.85, 1.15), random.uniform(0.24, 0.32),
                  random.uniform(0.065, 0.09), BASE * random.uniform(0.8, 1.5),
                  random.uniform(0.04, 0.09), 0.015, 0.55)
        n_clumps += 1
hb.verts.index_update()
hb.to_mesh(hm)
color_attr = hm.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
idx = {v.index: c for v, c in verts_color}
for i in range(len(hm.vertices)):
    c = idx.get(i, BASE)
    color_attr.data[i].color = (c.x, c.y, c.z, 1.0)
hb.free()
clumps = new_obj("HairClumps", hm)
scol = scalp.data.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
for i in range(len(scalp.data.vertices)):
    c = BASE * 0.7
    scol.data[i].color = (c.x, c.y, c.z, 1.0)
for o in (scalp, clumps):
    for poly in o.data.polygons:
        poly.use_smooth = True
    o.data.transform(M)  # head frame -> rest-pose world == bind space
    o.data.materials.append(material("HairMaterial", (1, 1, 1), 0.55, vertex_colors=True))
print("HAIR clumps", n_clumps)
export([scalp, clumps], os.path.join(OUT, "character-hair.glb"), colors=True)

# ═══ Beard ════════════════════════════════════════════════════════════════════════
face = bpy.data.objects["Plane.001"]  # glTF node "Face.002"
fbm = bmesh.new()
fbm.from_mesh(face.data)
bnd = [e for e in fbm.edges if e.is_boundary]
loops, seen = [], set()
for e in bnd:
    if e in seen:
        continue
    st, comp = [e], []
    seen.add(e)
    while st:
        cur = st.pop()
        comp.append(cur)
        for v in cur.verts:
            for e2 in v.link_edges:
                if e2.is_boundary and e2 not in seen:
                    seen.add(e2)
                    st.append(e2)
    loops.append({v for ed in comp for v in ed.verts})
hp = lambda v: Minv @ (face.matrix_world @ v.co)
mouth = min(loops, key=lambda vs: (sum((hp(v) for v in vs), Vector()) / len(vs) - Vector((0, 0.5, 0.9))).length)
MOUTH = [hp(v) for v in mouth]
fbm.free()


def beard_top(ax):
    # Moustache over the upper lip (below the nose) and a clean cheek line that runs from the
    # sideburn down to the mouth corner: an Italian beard leaves the upper cheeks bare.
    moustache = 0.875 - 0.07 * ss(0.2, 0.45, ax) - 0.30 * ss(0.45, 0.68, ax)
    cheek = 0.50 + 0.56 * ss(0.70, 0.98, ax)
    return max(moustache if ax < 0.7 else 0.0, cheek)


def beard_weight(p):
    ax = abs(p.x)
    top = beard_top(ax)
    w = 1 - ss(top - 0.03, top + 0.012, p.y)
    d = min((p - q).length for q in MOUTH)
    w *= ss(0.02, 0.05, d)                        # crisp line along the lips
    w *= 1 - ss(1.12, 1.18, p.z) * ss(0.8, 0.9, p.y)  # keep off the nose
    w *= ss(-0.12, 0.02, p.y)                     # neckline under the jaw
    w *= ss(-0.15, 0.15, p.z)                     # stop in front of the ears / at the neck
    return w


def growth_dir(p):
    # Direction hair grows, in the head frame: down over cheeks and chin, down-and-out on the moustache.
    ax = abs(p.x)
    if p.y > 0.66 and ax < 0.62 and p.z > 0.8:
        return Vector((math.copysign(0.75, p.x if ax > 0.02 else 1), -1.0, 0.0)).normalized()
    return Vector((math.copysign(0.15, p.x), -1.0, -0.25)).normalized()


bm = bmesh.new()
bm.from_mesh(face.data)
bmesh.ops.triangulate(bm, faces=bm.faces)
uv = bm.loops.layers.uv.active
tris = []
for f in bm.faces:
    P = [hp(l.vert) for l in f.loops]
    UV = [Vector((l[uv].uv.x, 1.0 - l[uv].uv.y)) for l in f.loops]
    W = [beard_weight(p) for p in P]
    if max(W) <= 0 and max(beard_weight(p) for p in P) <= 0 and min(p.y for p in P) > 1.2:
        continue
    # strand direction in UV space: express growth_dir in the triangle's (dP, dUV) basis
    e1, e2 = P[1] - P[0], P[2] - P[0]
    t1, t2 = UV[1] - UV[0], UV[2] - UV[0]
    g = growth_dir(sum(P, Vector()) / 3)
    a = Matrix(((e1.dot(e1), e1.dot(e2)), (e1.dot(e2), e2.dot(e2))))
    try:
        c = a.inverted() @ Vector((g.dot(e1), g.dot(e2)))
        du = t1 * c.x + t2 * c.y
        du = du.normalized() if du.length > 1e-9 else Vector((0, 1))
    except ValueError:
        du = Vector((0, 1))
    tris.append([[round(UV[i].x, 6), round(UV[i].y, 6), round(P[i].x, 5), round(P[i].y, 5), round(P[i].z, 5)]
                 for i in range(3)] + [[round(du.x, 4), round(du.y, 4)]])
bm.free()
# The painter re-evaluates beard_weight per pixel from the interpolated head-frame position, so it needs
# the same shape parameters (kept in sync with beard_top / beard_weight above).
json.dump({"tris": tris, "mouth": [[round(q.x, 5), round(q.y, 5), round(q.z, 5)] for q in MOUTH]},
          open(os.path.join(OUT, "beard_uv.json"), "w"))
print("BEARD tris exported", len(tris))

# Shell: face faces inside the beard, lifted along the normal for jaw/chin volume. It stays below the
# blink shape keys' region (head y > ~0.86) so it never has to follow a morph.
sm = bpy.data.meshes.new("BeardShell")
sbm = bmesh.new()
sbm.from_mesh(face.data)
sbm.transform(Minv @ face.matrix_world)
sbm.normal_update()
wts = {v: beard_weight(v.co) for v in sbm.verts}
bmesh.ops.delete(sbm, geom=[f for f in sbm.faces if min(wts[v] for v in f.verts) < 0.45 or
                            min(v.co.y for v in f.verts) > 0.84], context="FACES")
sbm.verts.ensure_lookup_table()
lift_of = {}
for v in sbm.verts:
    w = wts.get(v, 0.0)
    chin = ss(0.45, 0.15, v.co.y) * (1 - ss(0.35, 0.75, abs(v.co.x)))
    lift_of[v] = w * (0.022 + 0.03 * chin) * (1 - ss(0.76, 0.84, v.co.y))
for v in sbm.verts:
    v.co = v.co + v.normal * lift_of[v]
sbm.to_mesh(sm)
shell = new_obj("BeardShell", sm)
cl = sm.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
for i, v in enumerate(sm.vertices):
    p = v.co
    a = ss(0.55, 0.95, beard_weight(p))
    cl.data[i].color = (a, a, a, 1.0)  # mask in RGB (the exporter drops alpha); turned into alpha at load
sbm.free()
for poly in sm.polygons:
    poly.use_smooth = True
sm.transform(M)
sm.materials.append(material("BeardShellMaterial", (1, 1, 1), 0.95, vertex_colors=True))
export([shell], os.path.join(OUT, "beard-shell.glb"), colors=True, uvs=True)  # samples the face texture

# ═══ Overshirt ═════════════════════════════════════════════════════════════════════
shirt = bpy.data.objects["BODY.SHIRT"]
dg = bpy.context.evaluated_depsgraph_get()
osm = bpy.data.meshes.new_from_object(shirt.evaluated_get(dg))  # shape key applied, rest pose
osm.transform(shirt.matrix_world)
obm = bmesh.new()
obm.from_mesh(osm)
bmesh.ops.remove_doubles(obm, verts=obm.verts, dist=1e-4)  # weld the split centre seams
NECK_Y = 0.36  # neck axis (world y), front is -y


def open_w(z):
    # half-width of the front opening: hangs open at the hem, widest at the collar
    return 0.46 - 0.05 * ss(8.0, 10.3, z) + 0.42 * ss(10.7, 11.95, z)


def is_front(p):
    return p.y < 0.15


trim_neck = [f for f in obm.faces if f.material_index == 1 and f.calc_center_median().z > 11.55]
opening = [f for f in obm.faces if f not in trim_neck and is_front(f.calc_center_median()) and
           abs(f.calc_center_median().x) < open_w(f.calc_center_median().z) and f.calc_center_median().z > 6.8]
bmesh.ops.delete(obm, geom=list(set(trim_neck + opening)), context="FACES")
obm.verts.ensure_lookup_table()
# straighten the cut: front boundary vertices move onto the opening line
for v in obm.verts:
    if v.is_boundary and is_front(v.co) and abs(v.co.x) < open_w(v.co.z) + 0.3 and 7.25 < v.co.z < 11.9:
        v.co.x = math.copysign(open_w(v.co.z), v.co.x if abs(v.co.x) > 1e-4 else 1)
bound = [v for v in obm.verts if v.is_boundary and is_front(v.co) and 7.25 < v.co.z < 11.9]
for _ in range(12):
    bmesh.ops.smooth_vert(obm, verts=bound, factor=0.5, use_axis_x=False, use_axis_y=True, use_axis_z=True)
obm.normal_update()
# placket: faces along the opening edge get their own material and a slight ridge
for f in obm.faces:
    c = f.calc_center_median()
    if is_front(c) and c.z < 11.5 and abs(c.x) - open_w(c.z) < 0.15:
        f.material_index = 2
offs = {}
for v in obm.verts:
    ridge = 0.016 * (1 - ss(0.1, 0.16, abs(v.co.x) - open_w(v.co.z))) if is_front(v.co) and v.co.z < 11.5 else 0.0
    offs[v] = 0.045 + ridge
for v in obm.verts:
    v.co = v.co + v.normal * offs[v]

# collar along the neckline: stand, fold and a fall that lies on the shoulders; points at the front
# neckline: the largest connected run of boundary edges above the shoulders, walked end to end
nedges = [e for e in obm.edges if e.is_boundary and min(v.co.z for v in e.verts) > 11.3]
adj = {}
for e in nedges:
    a, b = e.verts
    adj.setdefault(a, []).append(b)
    adj.setdefault(b, []).append(a)
comps, seen_v = [], set()
for v0 in adj:
    if v0 in seen_v:
        continue
    st, comp = [v0], []
    seen_v.add(v0)
    while st:
        c = st.pop()
        comp.append(c)
        for w in adj[c]:
            if w not in seen_v:
                seen_v.add(w)
                st.append(w)
    comps.append(comp)
print("NECK components", sorted(len(c) for c in comps))
comp = max(comps, key=len)
ends = [v for v in comp if len(adj[v]) == 1]
start = min(ends, key=lambda v: v.co.x) if ends else min(comp, key=lambda v: v.co.y)
chain, prev, cur = [start], None, start
while True:
    nxt = [w for w in adj[cur] if w is not prev and w not in chain]
    if not nxt:
        break
    prev, cur = cur, nxt[0]
    chain.append(cur)
neck = comp
chain = [v.co.copy() for v in chain]


def resample(pts, n):
    d = [0.0]
    for a, b in zip(pts, pts[1:]):
        d.append(d[-1] + (b - a).length)
    out, j = [], 0
    for k in range(n):
        t = d[-1] * k / (n - 1)
        while j < len(d) - 2 and d[j + 1] < t:
            j += 1
        f = (t - d[j]) / max(1e-9, d[j + 1] - d[j])
        out.append(pts[j].lerp(pts[j + 1], f))
    return out


def smooth(pts, passes):
    for _ in range(passes):
        pts = [pts[0]] + [(pts[i - 1] + pts[i] * 2 + pts[i + 1]) / 4 for i in range(1, len(pts) - 1)] + [pts[-1]]
    return pts


# the traced boundary steps back and forth along the mesh edges; resample and smooth it
chain = smooth(resample(chain, 48), 12)
print("COLLAR chain", len(chain), "of", len(neck))
obm.to_mesh(osm)
obm.free()
body = new_obj("Overshirt", osm)
body_bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())

cm = bpy.data.meshes.new("Collar")
cbm = bmesh.new()
UP = Vector((0, 0, 1))
rows, falls = [], []
n = len(chain)
for i, v in enumerate(chain):
    p = v.copy()
    r = Vector((p.x, p.y - NECK_Y, 0)).normalized()
    endness = max(ss(0.18, 0.0, i / (n - 1)), ss(0.82, 1.0, i / (n - 1)))  # 1 at the front tips
    stand = p + UP * (0.13 * (1 - 0.5 * endness)) + r * 0.03
    fold = p + UP * (0.19 * (1 - 0.45 * endness)) + r * 0.11
    fall = p + r * (0.40 + 0.18 * endness) - UP * (0.06 + 0.32 * endness)
    loc, nrm, _, _ = body_bvh.find_nearest(fall)
    falls.append(loc + nrm * 0.035)
    rows.append([p - r * 0.01, stand, fold])
falls = smooth(falls, 6)
rows = [[cbm.verts.new(q) for q in row + [f]] for row, f in zip(rows, falls)]
for i in range(n - 1):
    for k in range(3):
        cbm.faces.new((rows[i][k], rows[i + 1][k], rows[i + 1][k + 1], rows[i][k + 1]))
cbm.to_mesh(cm)
cbm.free()
collar = new_obj("Collar", cm)
s2 = collar.modifiers.new("sol", "SOLIDIFY")
s2.thickness = 0.03
s2.offset = 0.0
s1 = body.modifiers.new("sol", "SOLIDIFY")
s1.thickness = 0.028
s1.offset = -1.0
for o, mname in ((body, "sol"), (collar, "sol")):
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=mname)
    for poly in o.data.polygons:
        poly.use_smooth = True
body.data.materials.clear()
navy = material("OvershirtBody", (0.0177, 0.0437, 0.1022), 0.9)  # #243B5A in linear
trim = material("OvershirtTrim", (0.0137, 0.0343, 0.0820), 0.9)
for m in (navy, navy, trim):
    body.data.materials.append(m)
collar.data.materials.append(trim)
# collar joins the body mesh so one SkinnedMesh carries the whole garment
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
collar.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
export([body], os.path.join(OUT, "overshirt.glb"))

# ═══ Preview renders ═══════════════════════════════════════════════════════════════
if RENDER:
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "MATERIAL"
    sc.render.resolution_x, sc.render.resolution_y = 700, 700
    sc.world = bpy.data.worlds.new("w")
    sc.world.color = (0.3, 0.32, 0.36)
    for o in bpy.data.objects:
        if o.name in ("CAP.001", "CAP.002") or (o.type == "MESH" and o.parent is None and o.name not in
                                                   ("HairScalp", "HairClumps", "BeardShell", "Overshirt")):
            o.hide_render = True
    bpy.data.materials["Material.008"].diffuse_color = (0.9, 0.89, 0.85, 1)
    bpy.data.materials["Material.010"].diffuse_color = (0.9, 0.89, 0.85, 1)
    bpy.data.materials["Material.007"].diffuse_color = (0.03, 0.02, 0.015, 1)
    for m in bpy.data.materials:
        if m.name.startswith("HairMaterial"):
            m.diffuse_color = (0.06, 0.042, 0.03, 1)
    bpy.data.materials["BeardShellMaterial"].diffuse_color = (0.08, 0.05, 0.035, 1)
    bpy.data.materials["OvershirtBody"].diffuse_color = (0.14, 0.23, 0.35, 1)
    bpy.data.materials["OvershirtTrim"].diffuse_color = (0.11, 0.19, 0.30, 1)
    cam = new_obj("cam", bpy.data.cameras.new("cam"))
    sc.camera = cam
    up = (M.to_3x3() @ Vector((0, 1, 0))).normalized()

    def shot(name, target, eye, lens):
        cam.data.lens = lens
        cam.location = eye
        fwd = (target - eye).normalized()
        right = fwd.cross(up).normalized()
        cam.rotation_euler = Matrix((right, right.cross(fwd), -fwd)).transposed().to_euler()
        sc.render.filepath = os.path.join(OUT, f"v3-{name}.png")
        bpy.ops.render.render(write_still=True)

    head = M @ Vector((0, 1.2, 0.3))
    shot("head-front", head, M @ Vector((0, 1.4, 9.5)), 60)
    shot("head-threeq", head, M @ Vector((6, 2.2, 7)), 60)
    shot("head-side", head, M @ Vector((9.5, 1.6, 0.5)), 60)
    shot("head-back", head, M @ Vector((-3, 3, -8.5)), 60)
    torso = Vector((0, 0, 10.0))
    shot("body-front", torso, Vector((0, -26, 11)), 50)
    shot("body-threeq", torso, Vector((16, -19, 12)), 50)
    shot("body-back", torso, Vector((0, 26, 11)), 50)
