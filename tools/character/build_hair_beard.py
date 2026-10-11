# Tier 2 (revised): a smooth, wavy hair dome built in the head-bone frame, plus beard weights over the
# face mesh's UVs for painting a soft-edged beard into a copy of the face texture.
# The original model is only read; outputs go to scratchpad/tier2.
import bpy, bmesh, os, math, sys, json
from mathutils import Vector, Matrix

SP = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(SP, "tier2")
os.makedirs(OUT, exist_ok=True)
RENDER = "norender" not in sys.argv

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(SP, "model", "character.glb"))
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
arm.data.pose_position = "REST"
bpy.context.view_layer.update()
M = arm.matrix_world @ arm.data.bones["spine.006"].matrix_local  # +Y up the head, +Z toward the face
Minv = M.inverted()


def ss(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


# ── Hair dome ────────────────────────────────────────
C = Vector((0.0, 1.72, 0.06))
R = Vector((1.06, 1.04, 1.12))
me = bpy.data.meshes.new("HairTop")
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=72, v_segments=44, radius=1.0)


def hairline(p):
    # low at the back (tucks under the existing side/back hair), high at the forehead
    return 1.25 + 0.57 * ss(-0.2, 0.65, p.z) - 0.38 * ss(0.62, 0.92, abs(p.x)) * ss(-0.1, 0.55, p.z)


for v in bm.verts:
    v.co = Vector((C.x + v.co.x * R.x, C.y + v.co.z * R.y, C.z + v.co.y * R.z))  # sphere Z -> head Y
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < hairline(v.co)], context="VERTS")
# round off the stair-stepped edge left by the cut
edge = [v for v in bm.verts if v.is_boundary]
for _ in range(25):
    bmesh.ops.smooth_vert(bm, verts=edge, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
bm.normal_update()
for v in bm.verts:
    p, n = v.co.copy(), v.normal.copy()
    top = ss(1.85, 2.5, p.y)
    wave = 0.08 * top * math.sin(6.0 * p.x + 2.0 * p.z + 0.5)
    quiff = 0.20 * math.exp(-((p.z - 0.65) ** 2) / 0.10 - ((p.x + 0.10) ** 2) / 0.30) * ss(1.95, 2.4, p.y)
    sides = 0.045 * ss(0.7, 1.0, abs(p.x)) * (1 - top)  # sit just outside the side hair band
    p = p + n * (0.03 * top + wave + quiff + sides)
    p.z -= 0.06 * ss(0.4, 1.0, p.z) * (1 - ss(2.1, 2.5, p.y))   # less of a visor over the forehead
    v.co = p
bm.to_mesh(me)
bm.free()
hair = bpy.data.objects.new("HairTop", me)
bpy.context.scene.collection.objects.link(hair)
sol = hair.modifiers.new("sol", "SOLIDIFY")
sol.thickness = 0.12
sol.offset = -1.0
bpy.context.view_layer.objects.active = hair
bpy.ops.object.modifier_apply(modifier="sol")
for poly in hair.data.polygons:
    poly.use_smooth = True
hair.data.transform(M)  # head frame -> rest-pose world (same space as the original meshes)
mat = bpy.data.materials.new("HairMaterial")
mat.use_nodes = True
b = mat.node_tree.nodes["Principled BSDF"]
b.inputs["Base Color"].default_value = (0.016, 0.013, 0.011, 1)
b.inputs["Roughness"].default_value = 0.85
mat.diffuse_color = (0.05, 0.045, 0.04, 1)
hair.data.materials.append(mat)
print("HairTop verts", len(hair.data.vertices))

bpy.ops.object.select_all(action="DESELECT")
hair.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "character-hair.glb"), export_format="GLB",
                          use_selection=True, export_animations=False, export_skins=False,
                          export_morph=False, export_texcoords=False, export_apply=True)
print("EXPORTED hair")

# ── Beard weights over the face UVs ──────────────────
face = bpy.data.objects["Plane.001"]  # glTF node "Face.002"


# the mouth opening is a boundary loop of the face mesh; the beard hugs it with a small lip margin
_bm = bmesh.new()
_bm.from_mesh(face.data)
_edges = [e for e in _bm.edges if e.is_boundary]
_loops, _seen = [], set()
for e in _edges:
    if e in _seen:
        continue
    stack, comp = [e], []
    _seen.add(e)
    while stack:
        cur = stack.pop()
        comp.append(cur)
        for v in cur.verts:
            for e2 in v.link_edges:
                if e2.is_boundary and e2 not in _seen:
                    _seen.add(e2)
                    stack.append(e2)
    _loops.append({v for ed in comp for v in ed.verts})
_target = Vector((0, 0.5, 0.9))
def _centroid(vs):
    return sum(((Minv @ (face.matrix_world @ v.co)) for v in vs), Vector()) / len(vs)
_mouth = min(_loops, key=lambda vs: (_centroid(vs) - _target).length)
MOUTH = [Minv @ (face.matrix_world @ v.co) for v in _mouth]
_c = _centroid(_mouth)
print("FACE boundary loops", len(_loops), "mouth loop verts", len(MOUTH), "centroid", tuple(round(x, 2) for x in _c),
      "y-range", round(min(p.y for p in MOUTH), 2), round(max(p.y for p in MOUTH), 2),
      "x-range", round(min(p.x for p in MOUTH), 2), round(max(p.x for p in MOUTH), 2))
_bm.free()


def beard_weight(p):
    top = 0.95 + 0.10 * ss(0.55, 0.9, abs(p.x))                     # sideburns reach a little higher
    w = 1 - ss(top - 0.08, top + 0.03, p.y)
    d = min((p - q).length for q in MOUTH)
    w *= ss(0.05, 0.15, d)                                          # clear lips
    w *= 1 - ss(1.08, 1.16, p.z)                                    # never paint the nose tip
    w *= ss(-0.55, -0.25, p.z)                                      # stop under the jaw
    return w


bm = bmesh.new()
bm.from_mesh(face.data)
bmesh.ops.triangulate(bm, faces=bm.faces)
uv = bm.loops.layers.uv.active
tris = []
for f in bm.faces:
    tri = []
    for loop in f.loops:
        p = Minv @ (face.matrix_world @ loop.vert.co)
        u, v = loop[uv].uv
        tri.append([round(u, 6), round(1.0 - v, 6), round(beard_weight(p), 4)])  # glTF v is flipped
    tris.append(tri)
bm.free()
json.dump({"tris": tris}, open(os.path.join(OUT, "beard_uv.json"), "w"))
print("BEARD tris", len(tris), "with weight>0:", sum(1 for t in tris if max(x[2] for x in t) > 0))

if RENDER:
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "MATERIAL"
    sc.render.resolution_x = sc.render.resolution_y = 600
    sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.3, 0.32, 0.36)
    keep = {"HairTop", "Plane.001", "Hair", "Ear.001", "Eyebrow", "EYEs.001", "Teeth.001", "Neck", "BODY.SHIRT"}
    for o in bpy.data.objects:
        if o.type == "MESH" and o.name not in keep:
            o.hide_render = True
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 70
    target = M @ Vector((0, 1.3, 0.3)); up = (M.to_3x3() @ Vector((0, 1, 0))).normalized()
    for name, d in [("front", Vector((0, 0.5, 9))), ("threeq", Vector((5.5, 1.2, 7))), ("side", Vector((9, 0.6, 0.2))), ("back", Vector((-3, 1.5, -8)))]:
        cam.location = M @ (Vector((0, 1.3, 0.3)) + d)
        fwd = (target - cam.location).normalized(); right = fwd.cross(up).normalized()
        cam.rotation_euler = Matrix((right, right.cross(fwd), -fwd)).transposed().to_euler()
        sc.render.filepath = os.path.join(OUT, f"t2b-{name}.png")
        bpy.ops.render.render(write_still=True)
        print("RENDERED", name)
