"use client";

import type { PageHeaderParent } from "./page-header-store";
import { usePageHeader } from "./use-page-header";

// Declarative sibling to usePageHeader() for Server Component pages that
// only need to set TopBar's title/description/parent and would otherwise
// have no reason to become a Client Component themselves.
export function PageHeader({
  title,
  description,
  parent,
}: {
  title?: string | null;
  description?: string | null;
  parent?: PageHeaderParent | null;
}) {
  usePageHeader({ title, description, parent });
  return null;
}
