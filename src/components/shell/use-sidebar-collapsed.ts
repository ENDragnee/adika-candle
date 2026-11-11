"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "sidebar-collapsed";

// Persists the desktop sidebar's collapsed/expanded state across reloads.
// Starts `false` (expanded) on the server and syncs the real stored value
// after mount — same hydration-safe pattern as ThemeSwitcher's own
// `mounted` guard, since localStorage isn't available during SSR and a
// wrong first paint here would just mean the sidebar briefly shows
// expanded before snapping to collapsed, not a broken render.
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return { collapsed, toggle };
}
