"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion";

// Epic 16's shared chart-entrance primitive. Returns whether a chart's
// entrance transition should be in its "entered" (final) state —
// `false` on first paint, flips to `true` one frame later so a CSS
// transition between the two states actually plays (going straight to
// `true` on mount would skip the transition, since there'd be no prior
// frame at the initial state for the browser to transition from).
//
// Reduced motion renders already-entered — no movement, not a disabled
// chart; see docs/DECISIONS.md and the `animate` skill's "fewer and
// gentler, not zero" rule.
//
// Gated additionally on `enabled` (default true) so a chart can defer
// "entered" until its data has actually loaded — entering with empty/zero
// data and then jumping to real values on data arrival would look like a
// second, unintended animation.
export function useChartEntrance(enabled = true): boolean {
  const reducedMotion = useReducedMotion();
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    if (!enabled || reducedMotion) {
      setHasEntered(enabled);
      return;
    }

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setHasEntered(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [enabled, reducedMotion]);

  return reducedMotion ? enabled : hasEntered;
}
