"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "./use-reduced-motion";

// Epic 16's shared "stat tile counts up" primitive. Writes the formatted
// number directly to the span's textContent inside requestAnimationFrame
// instead of calling setState every frame — a per-frame re-render would
// blow the frame budget for no visual benefit (see the
// animation-performance skill's "React: Don't Animate Through State").
// Attach the returned ref to the element that should display the number;
// its initial textContent (server-rendered) is the formatted target value,
// so content is correct even before this effect's first frame runs or if
// JS never loads.
export function useCountUp(
  target: number,
  {
    duration = 600,
    format = (n: number) => Math.round(n).toString(),
  }: {
    duration?: number;
    format?: (value: number) => string;
  } = {},
) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || reducedMotion) return;

    node.textContent = format(0);
    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      const elapsed = Math.min((now - start) / duration, 1);
      // ease-out cubic — matches the `animate` skill's "entering" easing.
      const eased = 1 - (1 - elapsed) ** 3;
      if (node) {
        node.textContent = format(target * eased);
      }
      if (elapsed < 1) {
        raf = requestAnimationFrame(tick);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, format, reducedMotion]);

  return ref;
}
