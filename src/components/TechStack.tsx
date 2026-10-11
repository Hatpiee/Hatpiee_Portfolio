import * as THREE from "three";
import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import {
  BallCollider,
  Physics,
  RigidBody,
  CylinderCollider,
  RapierRigidBody,
} from "@react-three/rapier";
import { TECH_STACK } from "../data/techStack";

const textureLoader = new THREE.TextureLoader();
const imageUrls = TECH_STACK.map((tech) => tech.image);
const textures = imageUrls.map((url) => textureLoader.load(url));

const sphereGeometry = new THREE.SphereGeometry(1, 28, 28);

const spheres = [...Array(30)].map(() => ({
  scale: [0.7, 1, 0.8, 1, 1][Math.floor(Math.random() * 5)],
}));

type SphereProps = {
  vec?: THREE.Vector3;
  scale: number;
  r?: typeof THREE.MathUtils.randFloatSpread;
  material: THREE.MeshPhysicalMaterial;
  isActive: boolean;
};

function SphereGeo({
  vec = new THREE.Vector3(),
  scale,
  r = THREE.MathUtils.randFloatSpread,
  material,
  isActive,
}: SphereProps) {
  const api = useRef<RapierRigidBody | null>(null);
  // Picked once per sphere; recomputing it on every re-render handed the body a
  // new random position whenever the parent re-rendered.
  const [position] = useState<[number, number, number]>(() => [
    r(20),
    r(20) - 25,
    r(20) - 10,
  ]);
  const strength = useMemo(() => new THREE.Vector3(), []);

  useFrame((_state, delta) => {
    // The body can be missing for a frame when the section mounts already in view.
    if (!isActive || !api.current) return;
    delta = Math.min(0.1, delta);
    const impulse = vec
      .copy(api.current.translation())
      .normalize()
      .multiply(
        strength.set(-50 * delta * scale, -150 * delta * scale, -50 * delta * scale)
      );

    api.current.applyImpulse(impulse, true);
  });

  return (
    <RigidBody
      linearDamping={0.75}
      angularDamping={0.15}
      friction={0.2}
      position={position}
      ref={api}
      colliders={false}
    >
      <BallCollider args={[scale]} />
      <CylinderCollider
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, 1.2 * scale]}
        args={[0.15 * scale, 0.275 * scale]}
      />
      <mesh
        castShadow
        receiveShadow
        scale={scale}
        geometry={sphereGeometry}
        material={material}
        rotation={[0.3, 1, 1]}
      />
    </RigidBody>
  );
}

// A positive-priority frame callback stops R3F's automatic render; the
// EffectComposer renders the frame itself, and only while it is enabled.
// Shaders are compiled up front so the first visible frame doesn't stall.
function ManualRender() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    gl.compile(scene, camera);
  }, [gl, scene, camera]);
  useFrame(() => {}, 1);
  return null;
}

type PointerProps = {
  vec?: THREE.Vector3;
  isActive: boolean;
};

function Pointer({ vec = new THREE.Vector3(), isActive }: PointerProps) {
  const ref = useRef<RapierRigidBody>(null);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ pointer, viewport }) => {
    if (!isActive) return;
    const targetVec = vec.lerp(
      target.set((pointer.x * viewport.width) / 2, (pointer.y * viewport.height) / 2, 0),
      0.2
    );
    ref.current?.setNextKinematicTranslation(targetVec);
  });

  return (
    <RigidBody
      position={[100, 100, 100]}
      type="kinematicPosition"
      colliders={false}
      ref={ref}
    >
      <BallCollider args={[2]} />
    </RigidBody>
  );
}

const TechStack = () => {
  const [isActive, setIsActive] = useState(false);
  // Starts on so the effect pass renders (and compiles) once before the observer
  // reports the real visibility.
  const [inView, setInView] = useState(true);
  const sectionRef = useRef<HTMLDivElement>(null);

  // The scene (shadows, 30 spheres and the ambient-occlusion pass) is only drawn
  // while the section is near the viewport; off screen it used to be drawn every
  // frame. Physics keeps running, so the spheres still gather in advance.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "200px 0px" }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const threshold = document
        .getElementById("work")!
        .getBoundingClientRect().top;
      setIsActive(scrollY > threshold);
    };
    const timers: number[] = [];
    const onNavClick = () => {
      const interval = window.setInterval(handleScroll, 10);
      timers.push(interval, window.setTimeout(() => clearInterval(interval), 1000));
    };
    const navLinks = document.querySelectorAll<HTMLAnchorElement>(".header a");
    navLinks.forEach((link) => link.addEventListener("click", onNavClick));
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => {
      navLinks.forEach((link) => link.removeEventListener("click", onNavClick));
      window.removeEventListener("scroll", handleScroll);
      timers.forEach((t) => {
        clearInterval(t);
        clearTimeout(t);
      });
    };
  }, []);
  const materials = useMemo(() => {
    return textures.map(
      (texture) =>
        new THREE.MeshPhysicalMaterial({
          map: texture,
          emissive: "#ffffff",
          emissiveMap: texture,
          emissiveIntensity: 0.3,
          metalness: 0.5,
          roughness: 1,
          clearcoat: 0.1,
        })
    );
  }, []);
  // One random logo per sphere, chosen once rather than on every render.
  const sphereMaterials = useMemo(
    () =>
      spheres.map(
        () => materials[Math.floor(Math.random() * materials.length)]
      ),
    [materials]
  );

  return (
    <div className="techstack" ref={sectionRef}>
      <h2 className="section-heading">
        My tech <span>stack</span>
      </h2>

      <Canvas
        aria-hidden="true"
        shadows
        gl={{ alpha: true, stencil: false, depth: false, antialias: false }}
        camera={{ position: [0, 0, 20], fov: 32.5, near: 1, far: 100 }}
        onCreated={(state) => (state.gl.toneMappingExposure = 1.5)}
        className="tech-canvas"
      >
        <ambientLight intensity={1} />
        <spotLight
          position={[20, 20, 25]}
          penumbra={1}
          angle={0.2}
          color="white"
          castShadow
          shadow-mapSize={[512, 512]}
        />
        <directionalLight position={[0, 5, -4]} intensity={2} />
        <Physics gravity={[0, 0, 0]}>
          <Pointer isActive={isActive} />
          {spheres.map((props, i) => (
            <SphereGeo
              key={i}
              {...props}
              material={sphereMaterials[i]}
              isActive={isActive}
            />
          ))}
        </Physics>
        <Environment
          files="/models/char_enviorment.hdr"
          environmentIntensity={0.5}
          environmentRotation={[0, 4, 2]}
        />
        <ManualRender />
        <EffectComposer enableNormalPass={false} enabled={inView}>
          <N8AO color="#0f002c" aoRadius={2} intensity={1.15} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default TechStack;
