import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";

// glTF node names lose their dots at load time ("BODY.SHIRT" -> "BODYSHIRT"),
// and multi-material meshes load as a Group of single-material meshes.
const CLOTHING: Record<string, string> = {
  BODYSHIRT: "#141414", // black sweatshirt: only kept if the overshirt fails to load
  Pant: "#7f97b2", // light-wash denim
  CAP001: "#151515", // cap crown: only visible if the hair file fails to load
  CAP002: "#151515", // cap brim
};

// With the overshirt on, the original sweatshirt becomes the inner crew-neck T-shirt.
const TEE = "#F4F2ED";
const OVERSHIRT = "#243B5A";
const OVERSHIRT_TRIM = "#1E3350"; // placket and collar, a shade darker
const FABRIC_ROUGHNESS = 0.9;

const SHIRT = "BODYSHIRT";
const CAP_PARTS = ["CAP001", "CAP002"];
const SIDE_HAIR = "Hair"; // the original short side/back hair band
const HEAD_BONE = "spine006";
const HAIR_URL = "/models/character-hair.glb";
const BEARD_SHELL_URL = "/models/beard-shell.glb";
const OVERSHIRT_URL = "/models/overshirt.glb";
const FACE_PART = "Face002";
// Copy of the face texture with the beard painted in (via the face UVs).
const BEARD_TEXTURE_URL = "/models/face-beard.webp";

// Dark brown, near black (linear); matches the base tone baked into the hair clumps.
const HAIR_BASE = new THREE.Color().setRGB(0.026, 0.017, 0.012);
// Matte enough that the coloured rim lights only edge the hair instead of tinting it.
const HAIR_ROUGHNESS = 0.8;

// Linear-space multipliers that lift the skin textures toward a medium-brown
// tone. The hand texture is darker than the face, so it needs more lift.
const SKIN_LIFT: Record<string, number> = {
  Material: 1.12, // face, ears, neck
  "hand Material": 2.1,
};

type MaterialLike = THREE.Material | THREE.Material[];

const mapMaterials = (
  material: MaterialLike,
  fn: (m: THREE.Material) => THREE.Material
): MaterialLike => (Array.isArray(material) ? material.map(fn) : fn(material));

const setColor = (m: THREE.Material, color: THREE.Color, roughness?: number) => {
  const clone = m.clone() as THREE.MeshStandardMaterial;
  if (clone.color) clone.color.copy(color);
  if (roughness !== undefined) {
    clone.roughness = roughness;
    clone.metalness = 0;
  }
  return clone;
};

const recolor = (
  character: THREE.Object3D,
  part: string,
  color: THREE.Color,
  roughness?: number
) =>
  character.getObjectByName(part)?.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    // Cloning per part keeps a shared material (shirt + trousers) independent.
    if (mesh.isMesh) mesh.material = mapMaterials(mesh.material, (m) => setColor(m, color, roughness));
  });

const meshesOf = (root: THREE.Object3D) => {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  return meshes;
};

export default function applyAppearance(character: THREE.Object3D) {
  Object.entries(CLOTHING).forEach(([part, hex]) => recolor(character, part, new THREE.Color(hex)));

  // One clone per skin material, shared by every mesh that used the original.
  const skinClones = new Map<THREE.Material, THREE.Material>();
  character.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = mapMaterials(mesh.material, (m) => {
      const lift = SKIN_LIFT[m.name];
      if (!lift) return m;
      if (!skinClones.has(m)) {
        const clone = m.clone() as THREE.MeshStandardMaterial;
        clone.color.multiplyScalar(lift);
        skinClones.set(m, clone);
      }
      return skinClones.get(m)!;
    });
  });
}

// The head bone's skin binding, taken from the original cap (weighted 100% to
// the head bone, like the face). New head parts are bound the same way.
function headBinding(character: THREE.Object3D) {
  let capMesh: THREE.SkinnedMesh | undefined;
  character.getObjectByName(CAP_PARTS[0])?.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh && !capMesh) capMesh = o as THREE.SkinnedMesh;
  });
  const boneIndex = capMesh?.skeleton.bones.findIndex((b) => b.name === HEAD_BONE) ?? -1;
  return capMesh && boneIndex >= 0 ? { mesh: capMesh, boneIndex } : undefined;
}

// Skins a mesh modelled in the original bind space rigidly to the head bone.
function attachToHead(
  binding: { mesh: THREE.SkinnedMesh; boneIndex: number },
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string
) {
  const count = geometry.attributes.position.count;
  const index = new Uint16Array(count * 4);
  const weight = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    index[i * 4] = binding.boneIndex;
    weight[i * 4] = 1;
  }
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(index, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weight, 4));
  const skinned = new THREE.SkinnedMesh(geometry, material);
  skinned.name = name;
  skinned.castShadow = true;
  skinned.receiveShadow = true;
  binding.mesh.parent!.add(skinned);
  skinned.bind(binding.mesh.skeleton, binding.mesh.bindMatrix);
  return skinned;
}

// Textured quiff: a scalp cover plus tapered hair clumps (tone varies per clump via
// vertex colours). The original side band is tinted to match and stays as the short
// sides. The cap is hidden only once this succeeds; on failure it stays.
export async function attachHair(
  character: THREE.Object3D,
  loader: GLTFLoader
): Promise<boolean> {
  const binding = headBinding(character);
  if (!binding) return false;

  try {
    const hair = await loader.loadAsync(HAIR_URL);
    const meshes = meshesOf(hair.scene);
    if (!meshes.length) return false;
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: HAIR_ROUGHNESS,
      metalness: 0,
    });
    meshes.forEach((src) => attachToHead(binding, src.geometry, material, `Custom_${src.name}`));

    CAP_PARTS.forEach((part) => {
      const obj = character.getObjectByName(part);
      if (obj) obj.visible = false;
    });
    recolor(character, SIDE_HAIR, HAIR_BASE, HAIR_ROUGHNESS);
    return true;
  } catch (err) {
    console.warn("Custom hair failed to load; keeping the original cap.", err);
    return false;
  }
}

// Swaps the face (only) onto the beard texture, then adds the beard shell: the
// beard's faces lifted slightly off the face for jaw and chin volume, faded out at
// the edges through its vertex alpha. On failure the original face (or the
// painted beard without the shell) stays.
export async function applyBeard(
  character: THREE.Object3D,
  loader: GLTFLoader
): Promise<boolean> {
  const meshes = meshesOf(character.getObjectByName(FACE_PART) ?? new THREE.Object3D());
  const current = meshes[0]?.material as THREE.MeshStandardMaterial | undefined;
  if (!current?.map) return false;

  let faceMaterial: THREE.MeshStandardMaterial;
  try {
    const texture = await new THREE.TextureLoader().loadAsync(BEARD_TEXTURE_URL);
    const original = current.map;
    texture.flipY = original.flipY;
    texture.colorSpace = original.colorSpace;
    texture.wrapS = original.wrapS;
    texture.wrapT = original.wrapT;
    texture.channel = original.channel;
    texture.anisotropy = 4;
    faceMaterial = current.clone();
    faceMaterial.map = texture;
    meshes.forEach((mesh) => (mesh.material = faceMaterial));
  } catch (err) {
    console.warn("Beard texture failed to load; keeping the original face.", err);
    return false;
  }

  const binding = headBinding(character);
  if (!binding) return true;
  try {
    const shell = await loader.loadAsync(BEARD_SHELL_URL);
    const material = faceMaterial.clone();
    material.normalMap = null; // no skin pores on the beard
    material.roughness = 1;
    material.vertexColors = true; // white, with the edge mask in alpha (see below)
    material.alphaHash = true; // dithered edge, no transparency sorting
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -1;
    meshesOf(shell.scene).forEach((src) => {
      // The file stores the edge mask as grey; the face texture supplies the colour.
      const mask = src.geometry.attributes.color;
      if (mask) {
        const rgba = new Float32Array(mask.count * 4);
        for (let i = 0; i < mask.count; i++) rgba.set([1, 1, 1, mask.getX(i)], i * 4);
        src.geometry.setAttribute("color", new THREE.Float32BufferAttribute(rgba, 4));
      } else {
        material.vertexColors = false;
      }
      attachToHead(binding, src.geometry, material, "Custom_BeardShell");
    });
  } catch (err) {
    console.warn("Beard shell failed to load; keeping the painted beard.", err);
  }
  return true;
}

// Bone weights for a new garment, copied from the nearest vertex of the original
// shirt (shape keys applied, as rendered). Both are in the same bind space.
function nearestSkin(parts: THREE.SkinnedMesh[]) {
  const pos: number[] = [];
  const idx: number[] = [];
  const wgt: number[] = [];
  parts.forEach((mesh) => {
    const g = mesh.geometry;
    const p = g.attributes.position;
    const si = g.attributes.skinIndex;
    const sw = g.attributes.skinWeight;
    const morphs = g.morphAttributes.position ?? [];
    const influences = mesh.morphTargetInfluences ?? [];
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i);
      let y = p.getY(i);
      let z = p.getZ(i);
      morphs.forEach((m, k) => {
        const f = influences[k] ?? 0;
        if (!f) return;
        if (g.morphTargetsRelative) {
          x += m.getX(i) * f;
          y += m.getY(i) * f;
          z += m.getZ(i) * f;
        } else {
          x += (m.getX(i) - x) * f;
          y += (m.getY(i) - y) * f;
          z += (m.getZ(i) - z) * f;
        }
      });
      pos.push(x, y, z);
      idx.push(si.getX(i), si.getY(i), si.getZ(i), si.getW(i));
      wgt.push(sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i));
    }
  });

  const CELL = 0.15;
  const key = (a: number, b: number, c: number) => `${a},${b},${c}`;
  const grid = new Map<string, number[]>();
  for (let i = 0; i < pos.length / 3; i++) {
    const k = key(
      Math.floor(pos[i * 3] / CELL),
      Math.floor(pos[i * 3 + 1] / CELL),
      Math.floor(pos[i * 3 + 2] / CELL)
    );
    const list = grid.get(k);
    if (list) list.push(i);
    else grid.set(k, [i]);
  }

  return (x: number, y: number, z: number) => {
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    const cz = Math.floor(z / CELL);
    let best = -1;
    let bestD = Infinity;
    for (let r = 0; r <= 6; r++) {
      for (let dx = -r; dx <= r; dx++)
        for (let dy = -r; dy <= r; dy++)
          for (let dz = -r; dz <= r; dz++) {
            if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== r) continue;
            grid.get(key(cx + dx, cy + dy, cz + dz))?.forEach((i) => {
              const d =
                (pos[i * 3] - x) ** 2 + (pos[i * 3 + 1] - y) ** 2 + (pos[i * 3 + 2] - z) ** 2;
              if (d < bestD) {
                bestD = d;
                best = i;
              }
            });
          }
      // anything in a further ring is at least r * CELL away
      if (best >= 0 && Math.sqrt(bestD) <= r * CELL) break;
    }
    return {
      index: idx.slice(best * 4, best * 4 + 4),
      weight: wgt.slice(best * 4, best * 4 + 4),
    };
  };
}

// The sweatshirt's rib trim (collar, cuffs, hem) is one mesh. With the overshirt
// on, its cuffs show at the sleeve ends, so they take the overshirt's trim colour
// while the collar and hem stay part of the off-white tee.
function tintCuffs(parts: THREE.SkinnedMesh[]) {
  const tee = new THREE.Color(TEE);
  const cuff = new THREE.Color(OVERSHIRT_TRIM);
  parts.forEach((mesh) => {
    const material = mesh.material as THREE.MeshStandardMaterial;
    if (material.name !== "Material.010") return; // the rib trim
    const p = mesh.geometry.attributes.position;
    const colors = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      // bind space: the cuffs are at the ends of the T-posed arms
      (Math.abs(p.getX(i)) > 3 ? cuff : tee).toArray(colors, i * 3);
    }
    mesh.geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    material.color.setRGB(1, 1, 1);
    material.vertexColors = true;
  });
}

// Open navy overshirt over the original sweatshirt, which becomes the off-white
// tee. If the overshirt can't load, the sweatshirt keeps its earlier colour.
export async function attachOvershirt(
  character: THREE.Object3D,
  loader: GLTFLoader
): Promise<boolean> {
  const parts: THREE.SkinnedMesh[] = [];
  character.getObjectByName(SHIRT)?.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) parts.push(o as THREE.SkinnedMesh);
  });
  if (!parts.length) return false;

  try {
    const overshirt = await loader.loadAsync(OVERSHIRT_URL);
    const meshes = meshesOf(overshirt.scene);
    if (!meshes.length) return false;
    const skinOf = nearestSkin(parts);
    const body = new THREE.MeshStandardMaterial({
      color: OVERSHIRT,
      roughness: FABRIC_ROUGHNESS,
      metalness: 0,
    });
    const trim = new THREE.MeshStandardMaterial({
      color: OVERSHIRT_TRIM,
      roughness: FABRIC_ROUGHNESS,
      metalness: 0,
    });
    const host = parts[0];
    // Recolour first: the overshirt joins the scene beside (not inside) the shirt group.
    recolor(character, SHIRT, new THREE.Color(TEE), 0.85);
    tintCuffs(parts);
    const parent = character.getObjectByName(SHIRT)!.parent!;

    meshes.forEach((src) => {
      const geometry = src.geometry;
      const p = geometry.attributes.position;
      const index = new Uint16Array(p.count * 4);
      const weight = new Float32Array(p.count * 4);
      for (let i = 0; i < p.count; i++) {
        const skin = skinOf(p.getX(i), p.getY(i), p.getZ(i));
        index.set(skin.index, i * 4);
        weight.set(skin.weight, i * 4);
      }
      geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(index, 4));
      geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weight, 4));
      const material = (src.material as THREE.Material).name === "OvershirtTrim" ? trim : body;
      const skinned = new THREE.SkinnedMesh(geometry, material);
      skinned.name = `Custom_${src.name}`;
      skinned.castShadow = host.castShadow;
      skinned.receiveShadow = host.receiveShadow;
      skinned.frustumCulled = host.frustumCulled;
      parent.add(skinned);
      skinned.bind(host.skeleton, host.bindMatrix);
    });
    return true;
  } catch (err) {
    console.warn("Overshirt failed to load; keeping the original shirt.", err);
    return false;
  }
}
