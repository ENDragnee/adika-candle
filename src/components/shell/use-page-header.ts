"use client";

import { useEffect } from "react";
import { usePageHeaderStore } from "./page-header-store";

// Lets a page override TopBar's nav-derived default title and/or give it a
// description subtitle — e.g. a product detail page showing the product's
// own name, or a list page's intro sentence moving out of its own inline
// heading and into TopBar's second line. Clears both fields back to null on
// unmount so an override doesn't leak into whatever page is navigated to
// next.
export function usePageHeader(header: {
  title?: string | null;
  description?: string | null;
}) {
  const setHeader = usePageHeaderStore((state) => state.setHeader);
  const { title, description } = header;

  useEffect(() => {
    setHeader({ title, description });
    return () => setHeader({ title: null, description: null });
  }, [title, description, setHeader]);
}
