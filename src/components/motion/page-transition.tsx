import { ViewTransition } from "react";

// Epic 16: one subtle crossfade on every route change, applied once at
// each shell boundary ((dashboard)/layout.tsx, app/page.tsx,
// auth/layout.tsx) rather than per-page. No shared-element morphing, no
// directional slides — see docs/DECISIONS.md for why the View Transitions
// API (React's built-in <ViewTransition>, zero new dependency) was chosen
// over a JS animation library, and why this stays a plain crossfade rather
// than Next's documented directional-slide pattern. Styling lives in
// globals.css (`::view-transition-old/new(root)`), gated by
// prefers-reduced-motion there. Usable directly in a Server Component —
// no "use client" needed, same as Suspense.
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <ViewTransition>{children}</ViewTransition>;
}
