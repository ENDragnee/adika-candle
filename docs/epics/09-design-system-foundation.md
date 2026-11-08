# Epic 9 — Design System Foundation

**Depends on:** 1 (Foundation/Shell)
**Status:** done

## Goal

Wire the shadcn design tokens that have sat unused in `globals.css` since
the original scaffold (`--radius`, `--card`, `--popover`, a full dark-mode
palette) through real components, and pick the one warm accent color the
palette has never had. This is pure foundation — every later UI epic
(10–12) builds on the primitives this epic lands: `Card`, `Skeleton`,
`DataTable`, the accent color, and Geist Sans as the base font in place of
the global `font-mono`.

## Scope

- **Typography:** base font switches from JetBrains Mono (applied
  app-wide via `html { @apply font-mono; }` in `globals.css`) to Geist
  Sans. `font-mono` stays available as an explicit per-element utility
  for code-like values (SKUs, reference codes, ids) — not the default.
- **Color:** one warm, candle/wax-inspired accent hue added to
  `--primary`/`--ring`/`--sidebar-primary`/`--sidebar-ring` in both the
  light and `.dark` blocks, contrast-checked against its `-foreground`
  pair. Neutrals stay achromatic. `--chart-*` (Epic 8's grayscale dataviz
  palette) is untouched.
- **Radius + elevation:** remove the `rounded-none` overrides and the
  many un-radiused inputs/boxes; adopt the existing `--radius` scale.
- **New shadcn primitives:** `Card`, `Skeleton`, `Dialog`, `Select`,
  `Table`, `Badge`, `Separator`, `Input`, `Label` added under
  `src/components/ui/`, alongside the existing `button.tsx`.
- **Shared `DataTable` primitive:** one reusable wrapper around the new
  `table.tsx` replacing the 13 hand-rolled `<table>` blocks across
  `src/features/**` — also what Epic 10's skeleton rows plug into.
- **Shell polish:** `src/components/shell/app-shell.tsx` gets a soft
  rounded active-nav pill in the accent color, a phosphor icon per nav
  item, subtle header elevation.
- **Dashboard stat tiles:** `manager-dashboard.tsx`'s bare-bordered
  `StatTile` becomes the new `Card`.

## Schema

None — purely visual/markup, no behavior or data changes.

## API routes

None new.

## Feature folders

- `src/components/ui/` (new primitives)
- `src/components/shell/` (nav/header polish)
- Touches `src/features/analytics/components/manager-dashboard.tsx` and
  the 13 files adopting `DataTable` — see `docs/DECISIONS.md` for the
  final list once implemented.

## Out of scope

- No skeleton/loading-state work beyond adding the `Skeleton` primitive
  itself — the sweep of all `isLoading` call sites is Epic 10.
- No sign-in/landing page changes — Epic 11.
- No remaining feature pages beyond the shared primitives above — Epic 12.
- No logic or behavior changes anywhere in this epic.

## Open questions

None — accent color and font choice are implementation decisions, logged
to `docs/DECISIONS.md` once settled rather than left open here.
