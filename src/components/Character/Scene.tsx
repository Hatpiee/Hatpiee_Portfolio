import { useEffect, useRef } from "react";
import * as THREE from "three";
import setCharacter from "./utils/character";
import setLighting from "./utils/lighting";
import { useLoading } from "../../context/LoadingProvider";
import handleResize from "./utils/resizeUtils";
import {
  handleMouseMove,
  handleTouchEnd,
  handleHeadRotation,
  handleTouchMove,
} from "./utils/mouseUtils";
import setAnimations from "./utils/animationUtils";
import { setProgress } from "../Loading";
import { onViewportResize } from "../utils/viewport";

// If the model has not arrived by then, let visitors into the site anyway.
const LOAD_WATCHDOG_MS = 30000;

const Scene = () => {
  const canvasDiv = useRef<HTMLDivElement | null>(null);
  const hoverDivRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef(new THREE.Scene());
  const { setLoading } = useLoading();

  useEffect(() => {
    const container = canvasDiv.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scene = sceneRef.current;
    let disposed = false;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setSize(rect.width, rect.height);
    // Capped at 2: phones report up to 3-3.5, which more than doubles the pixels drawn
    // every frame for no visible gain at this size.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(14.5, rect.width / rect.height, 0.1, 1000);
    camera.position.z = 10;
    camera.position.set(0, 13.1, 24.7);
    camera.zoom = 1.1;
    camera.updateProjectionMatrix();

    let headBone: THREE.Object3D | null = null;
    let screenLight: THREE.Mesh | null = null;
    let mixer: THREE.AnimationMixer | undefined;
    let character: THREE.Object3D | null = null;
    let removeHover: (() => void) | undefined;
    const clock = new THREE.Clock();

    const light = setLighting(scene);
    const progress = setProgress((value) => setLoading(value));
    const { loadCharacter } = setCharacter(renderer, scene, camera);
    const watchdog = window.setTimeout(() => progress.clear(), LOAD_WATCHDOG_MS);
    let introTimer: number | undefined;
    let removeResize: (() => void) | undefined;

    const onResize = () => {
      if (character) handleResize(renderer, camera, canvasDiv, character);
    };

    loadCharacter()
      .then((gltf) => {
        if (disposed) return;
        clearTimeout(watchdog);
        const animations = setAnimations(gltf);
        if (hoverDivRef.current) {
          removeHover = animations.hover(gltf, hoverDivRef.current);
        }
        mixer = animations.mixer;
        character = gltf.scene;
        scene.add(character);
        headBone = character.getObjectByName("spine006") || null;
        screenLight = (character.getObjectByName("screenlight") as THREE.Mesh) || null;
        progress.loaded().then(() => {
          introTimer = window.setTimeout(() => {
            light.turnOnLights();
            animations.startIntro();
          }, 2500);
        });
        removeResize = onViewportResize(onResize);
      })
      .catch((err) => {
        // The page stays fully usable without the 3D character.
        console.error("Character failed to load:", err);
        clearTimeout(watchdog);
        if (!disposed) progress.clear();
      });

    let mouse = { x: 0, y: 0 },
      interpolation = { x: 0.1, y: 0.2 };

    const onMouseMove = (event: MouseEvent) => {
      handleMouseMove(event, (x, y) => (mouse = { x, y }));
    };
    const onTouchMove = (e: TouchEvent) =>
      handleTouchMove(e, (x, y) => (mouse = { x, y }));
    const touchTargets = new Set<HTMLElement>();
    let debounce: number | undefined;
    const onTouchStart = (event: TouchEvent) => {
      const element = event.target as HTMLElement;
      debounce = window.setTimeout(() => {
        // Same function reference, so repeated touches never stack listeners.
        element?.addEventListener("touchmove", onTouchMove);
        touchTargets.add(element);
      }, 200);
    };

    const onTouchEnd = () => {
      handleTouchEnd((x, y, interpolationX, interpolationY) => {
        mouse = { x, y };
        interpolation = { x: interpolationX, y: interpolationY };
      });
    };

    document.addEventListener("mousemove", onMouseMove);
    const landingDiv = document.getElementById("landingDiv");
    if (landingDiv) {
      landingDiv.addEventListener("touchstart", onTouchStart);
      landingDiv.addEventListener("touchend", onTouchEnd);
    }

    // Skip drawing while the character is scrolled out of view (it is translated
    // off screen below the What I Do section); the loop itself keeps running.
    let visible = true;
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    visibility.observe(container);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      // Read every frame so the animation resumes without a jump after a pause.
      const delta = clock.getDelta();
      if (!visible) return;
      if (headBone) {
        handleHeadRotation(
          headBone,
          mouse.x,
          mouse.y,
          interpolation.x,
          interpolation.y,
          THREE.MathUtils.lerp
        );
        if (screenLight) light.setPointLight(screenLight);
      }
      if (mixer) {
        mixer.update(delta);
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      visibility.disconnect();
      clearTimeout(debounce);
      clearTimeout(watchdog);
      clearTimeout(introTimer);
      progress.stop();
      removeHover?.();
      removeResize?.();
      document.removeEventListener("mousemove", onMouseMove);
      if (landingDiv) {
        landingDiv.removeEventListener("touchstart", onTouchStart);
        landingDiv.removeEventListener("touchend", onTouchEnd);
      }
      touchTargets.forEach((el) => el.removeEventListener("touchmove", onTouchMove));
      scene.clear();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [setLoading]);

  return (
    <>
      <div className="character-container" aria-hidden="true">
        <div className="character-model" ref={canvasDiv}>
          <div className="character-rim"></div>
          <div className="character-hover" ref={hoverDivRef}></div>
        </div>
      </div>
    </>
  );
};

export default Scene;
