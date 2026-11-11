"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

// Mounted once in the root layout. `resolvedTheme` (not `theme`) so a
// "system" choice shows Sonner's actual current light/dark rendering,
// matching whatever the rest of the app is already showing — Sonner's own
// `theme` prop defaults to light and never tracks next-themes on its own.
export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="top-center"
      richColors
      closeButton
    />
  );
}
