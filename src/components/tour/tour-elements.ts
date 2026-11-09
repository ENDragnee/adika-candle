// Shared element-lookup helpers for Epic 20's guided tour. Nav items render
// twice at once (AppShell's desktop sidebar + BottomNav's mobile tab bar,
// both tagged with the same data-tour id for a given href) — only one is
// ever actually visible at a given viewport width, so FindTourElement picks
// whichever candidate isn't `display: none` rather than just the first
// match in DOM order.
const ACCOUNT_TRIGGER_TOUR_ID = "account-trigger";

// An element's own computed `display` says nothing about whether an
// *ancestor* is `display: none` (AppShell's desktop <aside> hides via
// `hidden md:flex` — the <a> inside still computes `display: flex` on
// itself). getClientRects() reflects the whole rendering pipeline, so it
// comes back empty whenever anything up the tree keeps the element from
// actually painting — regardless of the element's own position scheme
// (BottomNav is `fixed`, which also breaks the classic offsetParent trick).
function IsVisible(element: Element): boolean {
  return element.getClientRects().length > 0;
}

function TourSelector(id: string): string {
  return `[data-tour="${id}"]`;
}

function FindTourElement(id: string): Element | undefined {
  const candidates = document.querySelectorAll(TourSelector(id));
  return Array.from(candidates).find(IsVisible);
}

// One id per nav destination, derived from its href so nav-config.ts stays
// the single source of truth — AppShell/BottomNav compute the same id when
// stamping the data-tour attribute, and tour-steps.ts computes it again
// when building a step for that href. No string duplicated by hand.
function NavTourId(href: string): string {
  return `nav${href.replace(/\//g, "-")}`;
}

export { ACCOUNT_TRIGGER_TOUR_ID, FindTourElement, NavTourId };
