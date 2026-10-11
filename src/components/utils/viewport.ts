import { ScrollTrigger } from "gsap/ScrollTrigger";

// Mobile browsers fire "resize" whenever the address bar slides in or out during a
// scroll. Only the height changes then, and rebuilding the scroll triggers, the
// character canvas and the smoother's measurements on each one stalled the page for
// a moment mid-scroll. On touch-only devices these callbacks therefore run only when
// the width changes (including rotation); elsewhere they run on every resize, as before.
// Nothing they update depends on that height: the hero uses 100svh and the character
// canvas 80vh, neither of which changes with the address bar.
// A rotation can arrive as several resize events with the layout settling in between,
// so after a width change the callback runs once more when things have settled.
export function onViewportResize(callback: () => void) {
  const layoutWidth = () => document.documentElement.clientWidth;
  let width = layoutWidth();
  let settle: number | undefined;
  const handler = () => {
    const widthChanged = layoutWidth() !== width;
    width = layoutWidth();
    if (ScrollTrigger.isTouch !== 1) return callback();
    if (!widthChanged) return;
    callback();
    clearTimeout(settle);
    settle = window.setTimeout(callback, 400);
  };
  window.addEventListener("resize", handler);
  return () => {
    window.removeEventListener("resize", handler);
    clearTimeout(settle);
  };
}

// Effects that follow the mouse do nothing without one; on touch-only devices their
// per-frame loops are skipped.
export const hasFinePointer = () =>
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;
