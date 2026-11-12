"use client";

import { useCallback, useEffect, useState } from "react";

// Below `lg` (1024px) the expanded 240px sidebar leaves a tablet too little
// room for tables (Epic 22: at ~800px only ~560px remained), so the sidebar
// starts collapsed there and expanded on wider screens. A person's own
// toggle is remembered separately for each of the two width classes, so
// collapsing it on a tablet doesn't also collapse it on their desktop.
const COMPACT_QUERY = "(max-width: 1023px)";
const StorageKey = (compact: boolean) =>
  `sidebar-collapsed:${compact ? "compact" : "wide"}`;

function ReadPreference(compact: boolean): boolean {
  try {
    const stored = localStorage.getItem(StorageKey(compact));
    if (stored !== null) return stored === "true";
  } catch {
    // Storage can be unavailable (private mode); fall back to the default.
  }
  return compact;
}

// Starts expanded on the server and syncs after mount — a wrong first
// paint here is a brief width change, not a broken render.
export function useSidebarCollapsed() {
  const [compact, setCompact] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(COMPACT_QUERY);
    const Sync = () => {
      setCompact(media.matches);
      setCollapsed(ReadPreference(media.matches));
    };
    Sync();
    media.addEventListener("change", Sync);
    return () => media.removeEventListener("change", Sync);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(StorageKey(compact), String(next));
      } catch {
        // Not persisted; the toggle still works for this visit.
      }
      return next;
    });
  }, [compact]);

  return { collapsed, toggle };
}
