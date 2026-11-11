# Epic 10 — Loading States (Skeletons)

**Depends on:** 9 (Design System Foundation)
**Status:** done

## Goal

Replace every literal "Loading X…" text fallback with a skeleton that
matches the shape of the content it's standing in for, using Epic 9's
`Skeleton` primitive and `DataTable`.

## Scope

- `TableSkeleton` — N skeleton rows × the table's real column count,
  built against Epic 9's `DataTable`.
- `CardSkeleton` / stat-tile skeleton for `manager-dashboard.tsx`'s
  `StatTile` cards.
- A skeleton for `SalesTrendChart`'s loading state (matches its bar-chart
  shape, not a generic block).
- `DetailSkeleton` — a generic key-value skeleton for `dl`-style detail
  panels (e.g. `ProductOverview` in `product-detail.tsx`).
- Sweep all `isLoading` call sites across `src/features/**` (~21 as of
  Epic 9) and swap their inline loading text for the matching skeleton.

## Schema

None.

## API routes

None new.

## Feature folders

- `src/components/ui/` (skeleton variants, alongside Epic 9's `Skeleton`)
- Touches every `src/features/**/components/*.tsx` file with an
  `isLoading` branch.

## Out of scope

- Button-level mutation-pending spinners (Save/Submit while a mutation is
  in flight) — this epic is initial-fetch loading states only, matching
  what was asked for ("skeletons and loaders" for the data views).

## Open questions

None.
