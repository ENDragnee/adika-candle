"use client";

import { usePageHeader } from "./use-page-header";

// Declarative sibling to usePageHeader() for Server Component pages that
// only need to set TopBar's title/description and would otherwise have no
// reason to become a Client Component themselves. Render once near the top
// of the page's JSX, in place of what used to be an inline
// <h1>/<p> heading block.
export function PageHeader({
  title,
  description,
}: {
  title?: string | null;
  description?: string | null;
}) {
  usePageHeader({ title, description });
  return null;
}
