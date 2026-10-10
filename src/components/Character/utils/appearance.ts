import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";

// glTF node names lose their dots at load time ("BODY.SHIRT" -> "BODYSHIRT"),
// and multi-material meshes load as a Group of single-material meshes.
const CLOTHING: Record<string, string> = {
  BODYSHIRT: "#141414", // black shirt
  Pant: "#7f97b2", // light-wash denim
  CAP001: "#151515", // cap crown: only visible if the hair file fails to load
  CAP002: "#151515", // cap brim
};

const CAP_PARTS = ["CAP001", "CAP002"];
const HEAD_BONE = "spine006";
const HAIR_URL = "/models/character-hair.glb";
const FACE_PART = "Face002";
// Copy of the face texture with a short beard painted in (soft-edged, via the face UVs).
const BEARD_TEXTURE_URL = "/models/face-beard.webp";

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

const setColor = (m: THREE.Material, color: THREE.Color) => {
  const clone = m.clone() as THREE.MeshStandardMaterial;
  if (clone.color) clone.color.copy(color);
  return clone;
};

export default function applyAppearance(character: THREE.Object3D) {
  Object.entries(CLOTHING).forEach(([part, hex]) => {
    const color = new THREE.Color(hex);
    character.getObjectByName(part)?.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      // Cloning per part keeps a shared material (shirt + trousers) independent.
      if (mesh.isMesh) mesh.material = mapMaterials(mesh.material, (m) => setColor(m, color));
    });
  });

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

// Swaps the face (only) onto the beard texture; on failure the original stays.
export async function applyBeard(character: THREE.Object3D): Promise<boolean> {
  const face = character.getObjectByName(FACE_PART);
  const meshes: THREE.Mesh[] = [];
  face?.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  const current = meshes[0]?.material as THREE.MeshStandardMaterial | undefined;
  if (!current?.map) return false;

  try {
    const texture = await new THREE.TextureLoader().loadAsync(BEARD_TEXTURE_URL);
    const original = current.map;
    texture.flipY = original.flipY;
    texture.colorSpace = original.colorSpace;
    texture.wrapS = original.wrapS;
    texture.wrapT = original.wrapT;
    texture.channel = original.channel;
    const material = current.clone();
    material.map = texture;
    meshes.forEach((mesh) => (mesh.material = material));
    return true;
  } catch (err) {
    console.warn("Beard texture failed to load; keeping the original face.", err);
    return false;
  }
}

// Loads the hair top (modelled in Blender in the head bone's rest frame and
// exported in the original bind space) and skins it rigidly to the head bone,
// exactly as the original cap and face are weighted. The cap is hidden only once
// this succeeds; on failure the character keeps its (black) cap.
export async function attachHair(
  character: THREE.Object3D,
  loader: GLTFLoader
): Promise<boolean> {
  const cap = character.getObjectByName(CAP_PARTS[0]);
  let capMesh: THREE.SkinnedMesh | undefined;
  cap?.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh && !capMesh) capMesh = o as THREE.SkinnedMesh;
  });
  const boneIndex =
    capMesh?.skeleton.bones.findIndex((b) => b.name === HEAD_BONE) ?? -1;
  if (!capMesh || boneIndex < 0) return false;

  try {
    const hair = await loader.loadAsync(HAIR_URL);
    const meshes: THREE.Mesh[] = [];
    hair.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
    });
    if (!meshes.length) return false;

    meshes.forEach((src) => {
      const geometry = src.geometry.clone();
      const count = geometry.attributes.position.count;
      geometry.setAttribute(
        "skinIndex",
        new THREE.Uint16BufferAttribute(new Uint16Array(count * 4).map((_, i) => (i % 4 === 0 ? boneIndex : 0)), 4)
      );
      geometry.setAttribute(
        "skinWeight",
        new THREE.Float32BufferAttribute(new Float32Array(count * 4).map((_, i) => (i % 4 === 0 ? 1 : 0)), 4)
      );
      const skinned = new THREE.SkinnedMesh(geometry, src.material);
      skinned.name = `Custom_${src.name}`;
      skinned.castShadow = true;
      skinned.receiveShadow = true;
      capMesh!.parent!.add(skinned);
      skinned.bind(capMesh!.skeleton, capMesh!.bindMatrix);
    });

    CAP_PARTS.forEach((part) => {
      const obj = character.getObjectByName(part);
      if (obj) obj.visible = false;
    });
    return true;
  } catch (err) {
    console.warn("Custom hair failed to load; keeping the original cap.", err);
    return false;
  }
}
