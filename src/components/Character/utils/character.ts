import * as THREE from "three";
import { DRACOLoader, GLTF, GLTFLoader } from "three-stdlib";
import { setCharTimeline, setAllTimeline } from "../../utils/GsapScroll";
import { decryptFile } from "./decrypt";
import applyAppearance, { applyBeard, attachHair, attachOvershirt } from "./appearance";

const setCharacter = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
) => {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  // public/draco ships the JS decoder only (no WASM wrapper), so use it explicitly.
  dracoLoader.setDecoderConfig({ type: "js" });
  loader.setDRACOLoader(dracoLoader);

  const loadCharacter = async (): Promise<GLTF> => {
    const decrypted = await decryptFile(
      "/models/character.enc?v=2",
      "MyCharacter12"
    );
    const blobUrl = URL.createObjectURL(new Blob([decrypted]));
    try {
      const gltf = await loader.loadAsync(blobUrl);
      const character = gltf.scene;
      await renderer.compileAsync(character, camera, scene);
      applyAppearance(character);
      // None of these throw: on failure the character keeps its cap, original face
      // or original shirt.
      await Promise.all([
        attachHair(character, loader),
        applyBeard(character, loader),
        attachOvershirt(character, loader),
      ]);
      character.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.frustumCulled = true;
        }
      });
      setCharTimeline(character, camera);
      setAllTimeline();
      character.getObjectByName("footR")!.position.y = 3.36;
      character.getObjectByName("footL")!.position.y = 3.36;

      // Monitor scale is handled by GsapScroll.ts animations

      return gltf;
    } finally {
      URL.revokeObjectURL(blobUrl);
      dracoLoader.dispose();
    }
  };

  return { loadCharacter };
};

export default setCharacter;
