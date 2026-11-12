// One place for the app's motion timing (Epic 22). Before, each chart
// picked its own numbers (150ms–500ms), which felt hurried and uneven next
// to each other. Values sit in the calm band for a data tool: long enough
// to follow, short enough not to wait on. Easing is a strong ease-out —
// things arrive quickly and settle gently.
export const MOTION = {
  // Route-change crossfade — mirrored in globals.css
  // (::view-transition-*), which can't import this.
  routeMs: 220,
  // Count-up on stat tiles.
  countUpMs: 900,
  // Bars / strip segments growing from their baseline.
  barEnterMs: 520,
  barStaggerMs: 14,
  barStaggerCapMs: 320,
  // Line charts drawing in.
  lineDrawMs: 750,
  // A mark moving to a new value after a refetch.
  updateMs: 380,
  easeOut: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;
