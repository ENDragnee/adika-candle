# Epic 17 — Analytics Hub (Tabbed)

**Depends on:** 8 (Analytics/Dashboards), 14 (Raw Materials & Production
Tracking), 15 (Product Cost & Margin Tracking), 16 (Motion: Page
Transitions & Chart Entrance Animations)
**Status:** done

## Goal

Replace "a dashboard with some graphs" with a dedicated, tabbed analytics
page the Manager actually works from — four purpose-built views, each
with its own chart(s) and table, not one more wall of stat tiles.
`/manager/dashboard` (Epic 8) stays exactly as it is — the at-a-glance
operational home; this is a new, deeper `/manager/analytics` route for
actually analyzing the business.

**Reference:** `idea-boards/old-report-papers.jpg` (see Epic 14's note
for the full breakdown of what's on it). The Production tab's table
deliberately reuses the same **Opening Stock / Received / Consumption /
Closing Stock** column labels already on that paper form — the point is
that whoever currently fills it out by hand recognizes this screen
immediately, not that it looks like a generic BI dashboard.

## Pages & permissions

| Route | Notes | Permission |
|---|---|---|
| `/manager/analytics` | 4 tabs: Production, Profitability, Stock Health, Best Sellers | `analytics:read` (reused from Epic 8, no RBAC change) |

New nav item "Analytics" in `MANAGER_NAV_ITEMS` (`nav-config.ts`).
Manager-only — no Inventory Manager equivalent in this epic (their
dashboard stays exactly as Epic 8 built it).

## Scope

New `src/components/ui/tabs.tsx` — Radix `Tabs`, styled consistent with
every other Epic 9-era primitive (same radius/ring conventions as
`dialog.tsx`/`select.tsx`). This is the first formal `Tabs` primitive in
the app; `product-detail.tsx`'s existing hand-rolled button-row tab
switcher is not touched by this epic (out of scope — a separate,
optional cleanup, not required for this one to ship).

Each tab is its own focused GraphQL query — `productionReport`,
`profitability`, `stockHealth`, `bestSellers` — fetched lazily when that
tab is first opened, **not** one combined mega-query like Epic 8's
`dashboard`. These four aggregations are each heavier than anything in
the existing dashboard query, and a Manager may only ever look at one or
two tabs in a given sitting.

Every chart in every tab uses Epic 16's shared entrance-animation pattern
on initial render. This is a hard requirement of this epic, not optional
polish.

### Tab 1 — Production

Day / week / month granularity toggle. A report table per raw material
(Epic 14's `RawMaterialLedgerEntry`) and, side by side, per finished-goods
product (the existing `StockLedgerEntry`), both in the paper form's own
Opening/Received/Consumption/Closing shape for the selected period. Where
a product has an Epic 14 `ProductMaterialRequirement`, an "Expected
output" column (material consumed ÷ requirement ratio) sits next to
"Actual output" (`ACCEPT` entries in the same period) with a variance %;
a product with no recipe just shows actual output, no variance column —
this tab must never block on incomplete recipe data. A trend chart
(consumption vs. actual output over the selected window) sits above the
table.

### Tab 2 — Profitability

Stat tiles: total revenue, total cost, total profit, average margin %,
computed from `Sale.totalAmount` and `Sale.costPerKgAtSale` (Epic 15).
Sales with a `null` cost snapshot are excluded from the cost/profit
totals but still counted in revenue — the tile row states how many sales
were excluded so the Manager knows the margin figures are partial, not
silently wrong, for any period that includes pre-Epic-15 sales. A
margin-over-time chart and a per-product margin table (sell price, cost,
margin %, units sold, total profit), sortable.

### Tab 3 — Stock Health

Every active product bucketed into a status — Out of stock / Critical /
Low / Healthy / Overstocked — from `StockBalance.quantityKg` vs.
`Product.lowStockThresholdKg` (both already exist, Epic 8), plus a simple
days-of-cover estimate from recent sale velocity (e.g. trailing-30-day
average daily `quantityKg` sold). A distribution chart (count per status)
and a full sortable/filterable table with status badges.

### Tab 4 — Best Sellers

Period selector (day/week/month/custom range). Ranked bar chart + table
— units sold, revenue, category — with a trend indicator vs. the
equivalent prior period, ranked both by quantity and by revenue (two
rankings shown, not forced into one combined score).

## Schema

None new — this epic only reads Epics 8/14/15's tables.

## API routes

GraphQL: 4 new queries on `api/v1/graphql` — `productionReport`,
`profitability`, `stockHealth`, `bestSellers` — each taking a
period/granularity argument, following the same `Manager-only,
analytics:read` gate Epic 8's `dashboard` query already uses.

## Feature folders

- `src/features/analytics/` — new tab components + GraphQL query hooks
  alongside the existing `sales-trend-chart.tsx`
- `src/components/ui/tabs.tsx` (new)

## Out of scope

- No Inventory Manager-facing analytics changes.
- No CSV/PDF export of any report — a natural next ask, but not
  requested here; flagged so a future session doesn't assume it's
  implied by "proper analytic... tables."
- No literal digitization/upload of the paper form, no OCR — the
  Production tab is inspired by its column layout, not a scan-and-import
  feature.
- Charting approach (hand-built CSS grid, continuing Epic 8's precedent,
  vs. introducing a lightweight charting dependency now that this page
  needs 4+ distinct chart types) is decided during implementation, not
  here — see Open questions.

## Open questions

Charting approach: Epic 8 deliberately avoided a charting dependency for
one hand-built bar chart. This epic needs a trend/line chart (Production,
Profitability), a distribution chart (Stock Health), and a ranked bar
chart (Best Sellers) — enough variety that hand-building all of them in
the same bespoke CSS-grid style may cost more than it saves. Load the
`dataviz` skill either way (color/form/accessibility guidance applies
regardless of library choice) and log whichever way this goes in
`docs/DECISIONS.md`.
