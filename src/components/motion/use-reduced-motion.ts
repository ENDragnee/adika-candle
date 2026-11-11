"use client";

import { useEffect, useState } from "react";

// Shared by every Epic 16 motion primitive — a single source of truth for
// prefers-reduced-motion instead of each hook re-querying matchMedia.
// Starts `false` (SSR-safe default) and syncs after mount; the brief
// mismatch window matters less here than the hydration-safety it buys,
// since every primitive gates actual motion on this, not layout.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    const handleChange = (event: MediaQueryListEvent) =>
      setReduced(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}
