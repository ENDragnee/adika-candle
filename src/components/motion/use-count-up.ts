"use client";

import { useEffect, useRef } from "react";
import { MOTION } from "./motion-tokens";
import { useReducedMotion } from "./use-reduced-motion";

// Epic 16's "stat tile counts up" primitive, fixed in Epic 22. Writes the
// formatted number to the span's textContent inside requestAnimationFrame
// rather than through React state (a per-frame re-render would blow the
// frame budget). The caller still renders the final formatted value as
// the span's child, so the content is right before JS runs.
//
// It counts up from 0 once, on mount, and later eases from the previous
// value to the new one only when the *number* changes. Before Epic 22,
// `format` (always an inline function at the call site) was an effect
// dependency, so every re-render — a refetch, a hover — reset the number
// to 0 and replayed the count. `format` is now read through a ref.
export function useCountUp(
  target: number,
  {
    duration = MOTION.countUpMs,
    format = (n: number) => Math.round(n).toString(),
  }: {
    duration?: number;
    format?: (value: number) => string;
  } = {},
) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();
  const formatRef = useRef(format);
  formatRef.current = format;
  // null until the first animation has run — the mount count starts at 0.
  const shownRef = useRef<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = shownRef.current ?? 0;
    shownRef.current = target;
    if (reducedMotion || from === target) {
      node.textContent = formatRef.current(target);
      return;
    }

    node.textContent = formatRef.current(from);
    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      const elapsed = Math.min((now - start) / duration, 1);
      // ease-out quint: arrives fast, settles gently.
      const eased = 1 - (1 - elapsed) ** 5;
      if (node) {
        node.textContent = formatRef.current(from + (target - from) * eased);
      }
      if (elapsed < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // An interrupted count lands on its final value, never mid-number.
      if (node) node.textContent = formatRef.current(target);
    };
  }, [target, duration, reducedMotion]);

  return ref;
}
