"use client";

import { useEffect } from "react";
import { type PageHeaderParent, usePageHeaderStore } from "./page-header-store";

// Lets a page override TopBar's nav-derived default title, give it a
// description subtitle, and/or a parent breadcrumb. Clears everything back
// to null on unmount so an override doesn't leak into whatever page is
// navigated to next.
export function usePageHeader(header: {
  title?: string | null;
  description?: string | null;
  parent?: PageHeaderParent | null;
}) {
  const setHeader = usePageHeaderStore((state) => state.setHeader);
  const { title, description, parent } = header;
  const parentLabel = parent?.label ?? null;
  const parentHref = parent?.href ?? null;

  useEffect(() => {
    setHeader({
      title,
      description,
      parent:
        parentLabel && parentHref
          ? { label: parentLabel, href: parentHref }
          : null,
    });
    return () => setHeader({ title: null, description: null, parent: null });
  }, [title, description, parentLabel, parentHref, setHeader]);
}
