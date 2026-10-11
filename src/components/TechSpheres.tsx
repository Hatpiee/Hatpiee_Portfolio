import { CSSProperties, useEffect, useRef } from "react";
import { TECH_STACK } from "../data/techStack";
import { prefersReducedMotion } from "./utils/motion";
import "./styles/TechSpheres.css";

// Phones and tablets get this light stand-in for the desktop's 3D tech spheres (a
// physics scene with an ambient-occlusion pass, a second WebGL context and a 2.5 MB
// chunk): the same logo spheres as a CSS pile that gathers when the section arrives,
// drifts gently while it's on screen and bounces when tapped.
// Positions are centres in % of the box; sizes are relative to the largest sphere.
const SPHERES: [x: number, y: number, size: number][] = [
  [50, 50, 1],
  [29, 38, 0.9],
  [71, 39, 0.95],
  [38, 72, 0.85],
  [63, 73, 1],
  [16, 62, 0.75],
  [84, 63, 0.8],
  [50, 22, 0.8],
  [24, 86, 0.7],
  [77, 88, 0.7],
  [11, 34, 0.65],
  [89, 35, 0.7],
  [33, 13, 0.6],
  [67, 12, 0.65],
];

const TechSpheres = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    // "near" loads the logos shortly before the pile is reached; "in" gathers the
    // spheres and runs the drift only while the pile is on screen.
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        box.classList.add("tech-spheres-near");
        near.disconnect();
      },
      { rootMargin: "600px 0px" }
    );
    const inView = new IntersectionObserver(([entry]) => {
      box.classList.toggle("tech-spheres-in", entry.isIntersecting);
    });
    near.observe(box);
    inView.observe(box);

    const onTap = (e: Event) => {
      const sphere = (e.target as HTMLElement).closest<HTMLElement>(".tech-sphere");
      if (!sphere || prefersReducedMotion()) return;
      sphere.classList.remove("tech-sphere-bump");
      void sphere.offsetWidth; // restart the animation on repeated taps
      sphere.classList.add("tech-sphere-bump");
    };
    const onBumpEnd = (e: AnimationEvent) => {
      if (e.animationName === "techSphereBump") {
        (e.target as HTMLElement)
          .closest(".tech-sphere")
          ?.classList.remove("tech-sphere-bump");
      }
    };
    box.addEventListener("pointerdown", onTap);
    box.addEventListener("animationend", onBumpEnd);
    return () => {
      near.disconnect();
      inView.disconnect();
      box.removeEventListener("pointerdown", onTap);
      box.removeEventListener("animationend", onBumpEnd);
    };
  }, []);

  return (
    <div className="tech-spheres" ref={ref} aria-hidden="true">
      {SPHERES.map(([x, y, size], i) => (
        <span
          className="tech-sphere"
          key={i}
          style={
            {
              "--x": `${x}%`,
              "--y": `${y}%`,
              // Direction from the centre, for the scattered start of the gather.
              "--dx": x - 50,
              "--dy": y - 50,
              "--s": size,
              "--i": i,
              "--img": `url(${TECH_STACK[i % TECH_STACK.length].image})`,
              zIndex: Math.round(size * 10),
            } as CSSProperties
          }
        >
          <span className="tech-sphere-drift">
            <span className="tech-sphere-in" />
          </span>
        </span>
      ))}
    </div>
  );
};

export default TechSpheres;
