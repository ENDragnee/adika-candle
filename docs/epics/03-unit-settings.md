# Epic 3 — Unit Settings

**Depends on:** 1 (Foundation/Shell)
**Status:** not-started

## Goal

Manager can edit Carton/Packet/Wax/Kir → KG conversion ratios at runtime.
This becomes the shared conversion primitive Epics 4 (Stock) and 6 (Sales)
both depend on — build the shared helper here, don't let either later epic
reimplement conversion logic.

## Pages & permissions

| Route | Notes | Permission |
|---|---|---|
| `/manager/settings` | hub page, links to sub-settings | `unit-conversion:manage` |
| `/manager/settings/units` | edit unit list + ratios | `unit-conversion:manage` |

## Schema

```prisma
model UnitConversion {
  id         String   @id @default(cuid())
  unitName   String   @unique   // "CARTON" | "PACKET" | "WAX" | "KIR" | "KG" — string, not enum (see below)
  ratioToKg  Decimal
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@map("unit_conversion")
}
```

`unitName` is a plain string, not a Prisma enum — the set is
Manager-editable at runtime per the binding product decision, so an enum
would force a code deploy to add or rename a unit. Validate it with Zod
against the live table, not the type system. Record this in
`docs/DECISIONS.md` when this epic lands.

## API routes

REST: `api/v1/unit-conversions` (GET list, POST create), `api/v1/unit-conversions/[id]` (PATCH ratio/active, DELETE deactivate).

## Feature folders

- `src/features/unit-conversions/` — exposes a shared
  `convertToKg(unitName, qty)` helper (reads from this table) that Epic 4's
  "Accept Stock" form and Epic 6's "Record Sale" form both import. This is
  the piece that prevents those two screens from re-implementing conversion
  logic separately.

## Out of scope

- No model actually *uses* a unit yet — `Product`, `StockLedgerEntry`, and
  `Sale` don't reference `UnitConversion` until Epics 4 and 6 wire them up.

## Open questions

None — string-vs-enum was resolved by the binding "Manager-editable"
product decision; don't revisit without a product-level reason.
