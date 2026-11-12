"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/feedback/error-state";

// Catches a crash anywhere outside (dashboard)/ — the landing page and
// sign-in. Still renders inside the root layout (providers, fonts,
// globals.css), unlike global-error.tsx. See docs/DECISIONS.md.
export default function RootError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorState error={error} retry={retry} fullScreen />;
}
