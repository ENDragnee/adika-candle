"use client";

import { useEffect } from "react";
import { usePageTitleStore } from "./page-title-store";

// Lets a page override the TopBar's nav-derived default title — e.g. a
// product detail page showing the product's own name once it loads.
// Clears back to null on unmount so the override doesn't leak into
// whatever page the user navigates to next.
export function usePageTitle(title: string | null | undefined) {
  const setTitle = usePageTitleStore((state) => state.setTitle);

  useEffect(() => {
    setTitle(title ?? null);
    return () => setTitle(null);
  }, [title, setTitle]);
}
