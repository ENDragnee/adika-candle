# Epic 16 — Motion: Page Transitions & Chart Entrance Animations

**Depends on:** 9 (Design System Foundation)
**Status:** done

## Goal

Two related but separable pieces of app-wide motion work: (1) an animated
transition when navigating between routes, replacing today's instant
swap; (2) a shared entrance-animation treatment for charts — stat tiles
count up, bars/lines draw in — applied retroactively to the existing
`SalesTrendChart` and reused by every chart Epic 17 builds. Landing this
*before* Epic 17 means the Analytics Hub's charts are built against an
already-settled animation primitive instead of each tab improvising its
own one-off treatment.

This app has no animation dependency today beyond `tw-animate-css`'s
Tailwind utility classes (already used for `Dialog`/`DropdownMenu`'s
`data-open:animate-in` enter transitions, per Epic 9/13). Whether that's
enough, or a JS animation library is warranted, is this epic's one real
open question — see below.

## Scope

- **Research spike, first task — not a deferred decision.** Load the
  `animate` skill before writing any code. Check whether Next 16.4.5 with
  `cacheComponents: true` supports the View Transitions API cleanly for
  App Router navigations (Next has had experimental support in recent
  versions), or whether that interacts badly with this app's existing
  `instant = false` opt-outs (see `AGENTS.md`'s Conventions section) —
  decide and log the choice in `docs/DECISIONS.md` before building
  anything else in this epic.
- A page-transition wrapper applied once at the shell level
  (`(dashboard)/layout.tsx`'s `AppShell`, plus the public/auth layouts
  from the landing-page work) — short and subtle, per the `animate`
  skill's restraint guidance for a business admin tool, not a marketing
  site. Must respect `prefers-reduced-motion`.
- A shared chart-entrance pattern — a small hook or wrapper component —
  covering: bars/columns growing in from a zero baseline, line/area paths
  drawing in, and stat-tile numbers counting up from 0 to their final
  value. Applied to the existing `SalesTrendChart`
  (`src/features/analytics/components/sales-trend-chart.tsx`) as the
  proof case and retrofit.
- Load the `animation-performance` skill before implementing. These are
  hand-rolled CSS-grid charts today (no SVG/canvas — see Epic 8's
  decision log), so keep every entrance animation on composite-friendly
  properties (`transform`/`opacity`), not ones that trigger layout.

## Schema

None. No API routes.

## Feature folders

- A new shared location for the chart-entrance primitive — e.g.
  `src/components/motion/` (new) — exact placement is an implementation
  detail, not worth deciding here.
- `src/features/analytics/components/sales-trend-chart.tsx` (retrofit)
- `src/app/(dashboard)/layout.tsx`, `src/app/page.tsx`,
  `src/app/auth/layout.tsx` (page-transition wrapper)

## Out of scope

- Epic 17's own charts are **not** built in this epic — only the shared
  pattern they consume.
- No animation on `DataTable` row content, table sort/filter, or any
  other non-chart, non-navigation UI — this epic is charts and page
  transitions specifically, not a general "add motion everywhere" pass.
  (A future, separate ask could use the `find-animation-opportunities`
  or `improve-animations` skills for that kind of broader sweep.)

## Open questions

View Transitions API vs. a JS animation library (`motion`, the Framer
Motion successor) for the page-transition wrapper — see the research
spike above. This is the one thing deliberately left for implementation
time rather than guessed at in this doc.
