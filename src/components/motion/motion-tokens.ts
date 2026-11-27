// One place for the app's motion timing. The app is a business tool, so
// motion is kept to the minimum that helps: no route transitions, no
// count-ups, no chart entrances or staggers. Data shows up in its final
// state; only a value that changes on an already-visible chart eases to
// its new position, briefly, so the change is noticed rather than missed.
// See docs/DECISIONS.md, "Corporate motion pass".
export const MOTION = {
  // A mark moving to a new value after a refetch.
  updateMs: 200,
  // Hover dimming of sibling marks.
  hoverMs: 120,
  easeOut: "cubic-bezier(0.25, 1, 0.5, 1)",
} as const;
