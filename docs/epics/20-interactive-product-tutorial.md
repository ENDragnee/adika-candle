# Epic 20 — Interactive Product Tutorial

**Depends on:** 9 (Design System Foundation), 16 (Motion: Page
Transitions & Chart Entrance Animations)
**Status:** done

## Goal

An interactive guided tour that highlights real UI elements (sidebar
nav, `TopBar`, key per-role actions) and explains them step-by-step,
triggered by a button in the avatar/account dropdown
(`src/components/shell/account-menu.tsx` — the same menu that currently
holds the theme switcher and sign-out).

## Research spike: tour library

Pick before writing any tour step code. Candidates, as handed down for
this epic:

- **driver.js** (MIT, framework-agnostic, lightweight, no React wrapper
  needed — drive it imperatively from a Client Component).
- **shepherd.js** (also framework-agnostic but heavier, ships
  Bootstrap-flavored default CSS that would need a full custom theme to
  match this app).
- **reactour** (React-specific, smaller ecosystem).
- **intro.js** (older, widely known, but check its license before
  using — it has moved to a dual AGPL/commercial license in recent
  versions, which may be a blocker for this project).

**Leaning, not a final call:** driver.js. It needs the least CSS-theme
override work (no Bootstrap-flavored defaults to undo, unlike
shepherd.js), has no React-coupling to fight (unlike reactour, and this
app otherwise drives animation imperatively too — see Epic 16's
`<ViewTransition>` usage), and has no licensing question mark (unlike
intro.js). Confirm current license/maintenance status before committing
— don't take this write-up's word for it as of its writing date.

No tour library is installed today (`package.json` has none of the
four) — unlike Epic 16, which avoided a new dependency entirely via
React 19.3's native `<ViewTransition>`, there's no dependency-free
equivalent for a guided-tour overlay. Adding one library here is
expected, not something to engineer around.

## One button, two role-scoped step sets

**Decision:** one "Take a tour" entry in `AccountMenu`'s dropdown (new
`DropdownMenuItem`, alongside the existing theme options and sign-out),
shared by both roles — but the step *sequence* it starts is chosen by
`user.role` (`AccountMenu` already receives the full `AppUser`, so no
new prop threading is needed to know which role is touring). Manager's
tour covers `MANAGER_NAV_ITEMS`-only destinations (Analytics, Users,
Roles, Settings) that Inventory Manager never sees; Inventory Manager's
tour covers its own, smaller nav (`INVENTORY_NAV_ITEMS`) plus its two
operational actions (Record sale, Accept stock) that don't exist in the
Manager's own flow. One shared step-rendering engine, two step-list data
arrays (e.g. `MANAGER_TOUR_STEPS` / `INVENTORY_TOUR_STEPS`), selected by
role at trigger time — not two copies of the tour *component*.

**Target elements need stable anchors.** Sidebar nav items
(`AppShell`), the bottom tab bar (`BottomNav`), `TopBar`, and whichever
per-role action buttons the tour calls out (e.g. `InventorySalesView`'s
"Record sale" button, `InventoryStockView`'s "Accept stock" button,
`CreateProductTrigger`) will need a stable `data-tour="<step-id>"` (or
similar) attribute added as a hook for the library to attach each step's
popover to — plan for a small, mechanical edit across those existing
files, not a rewrite of any of them.

## Theming and motion

Load the `animate` skill before building anything — the tour's
step-transition motion must follow the same restraint/reduced-motion
rules already applied elsewhere in this app (`docs/DECISIONS.md`, "Epic
16 decisions"; respect `prefers-reduced-motion` the same way
`useReducedMotion` does for chart entrances). It must render correctly in
both light and dark mode using this app's existing CSS tokens (the same
`border`/`background`/`foreground`/`ring` tokens every `src/components/
ui/*` primitive already uses) — **not** the chosen library's own default
popover/overlay theme left unmodified. Treat this the same way Epic 17
treated the new `Tabs` primitive: restyle to match, don't bolt on a
foreign look.

## Feature folder

- `src/components/tour/` (new) — shared, non-domain UI, same tier as
  `src/components/motion/` (Epic 16) and `src/components/shell/`, not a
  `src/features/` business feature. Holds the tour-engine wrapper around
  the chosen library, the two role-scoped step-list data arrays, and any
  theming/CSS override needed.

## Schema

None.

## API routes

None — pure client-side UI, no persistence of tour progress (see Out of
scope).

## Out of scope

- **No "mark as seen" / auto-launch-on-first-sign-in persistence** —
  keep this a manually-triggered button for v1. See Open questions for
  when this should be revisited.
- No per-step analytics/tracking of tour completion.
- No tour content for the public landing/sign-in pages — this is a
  signed-in, inside-the-app feature only, consistent with Epic 18/19 both
  staying behind `TopBar`/`AppShell`.

## Open questions

Is localStorage-based "seen" tracking (auto-launch the tour once per
user, on first sign-in, then never again unless manually re-triggered)
clearly warranted? The brief explicitly asks to flag this rather than
decide it outright. Leaning no for v1: this app has exactly two roles and
a small, fairly static nav — a new hire needing the tour is a rare event,
not a frequent-first-run problem, and a manually-triggered button in a
menu the user already opens (for theme/sign-out) is discoverable enough
without adding `localStorage` state to track. Revisit only if real users
report not finding the tour on their own.
