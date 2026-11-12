"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/feedback/error-state";

// Sits between (dashboard)/layout.tsx and the page that crashed — AppShell
// (sidebar/TopBar/BottomNav) stays mounted and usable, only the main
// content is replaced. Also catches a page's first data load failing
// (React Query throwOnError, see QueryProvider). See docs/DECISIONS.md.
export default function DashboardError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorState error={error} retry={retry} />;
}
