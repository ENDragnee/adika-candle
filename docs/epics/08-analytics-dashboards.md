# Epic 8 — Analytics / Dashboards

**Depends on:** 2 (Products/Pricing), 4 (Stock), 5 (Customers/Loans), 6 (Sales)
**Status:** done — see docs/DECISIONS.md, "Epic 8 decisions" for the
low-stock-threshold schema addition, sales-trend window/grouping, and
charting approach.

## Goal

Fill in the Manager and Inventory Manager dashboards for real: sales
trends, stock levels, loan exposure, low-stock alerts. Route shells for
both already exist from Epic 1 — this epic only adds content.

## Pages & permissions

| Route | Notes | Permission |
|---|---|---|
| `/manager/dashboard` | sales trend + stock levels + loan exposure + low-stock alerts, combined | `analytics:read` |
| `/inventory/dashboard` | simpler operational view: own recent sales, stock levels for products they handle | `stock:read` |

## Schema

None new — read-only aggregation over everything built in Epics 2–6.

## API routes

GraphQL: `api/v1/graphql`'s `dashboard` query (or role-scoped queries) —
this is the epic that actually exercises the REST/GraphQL split decided in
`docs/DECISIONS.md`: a single query combining sales/stock/loan aggregates
in one round-trip, which REST's one-resource-per-endpoint shape doesn't
fit well.

Inventory Manager's dashboard is simple enough it can stay REST if that
turns out simpler when this epic is actually built — the GraphQL
reservation is for the Manager dashboard's cross-resource aggregation
specifically.

## Feature folders

- `src/features/analytics/`

## Out of scope

- No new mutations — purely additive reporting.
- No new schema.

## Open questions

None.
