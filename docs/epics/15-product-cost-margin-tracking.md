# Epic 15 — Product Cost & Margin Tracking

**Depends on:** 2 (Categories/Products/Pricing), 6 (Unified Sales Flow)
**Status:** done

## Goal

Give every product a cost-over-time history, mirroring `Price`'s own
"variable over time, never a single current-price field" design exactly
(see `AGENTS.md`), so Epic 17's Profitability tab can compute real
margins — sell price minus cost — snapshotted per sale the same way
`unitPriceAtSale` already is. Without this, "profit and margins" has no
data to report on at all: nothing in the schema today stores a cost basis
anywhere.

## Pages & permissions

| Route | Notes | Permission |
|---|---|---|
| `/manager/products/[id]` | existing product detail page gains a cost history section/tab alongside the existing price history tab, plus a "Set new cost" modal (Epic 13 pattern) | `product:manage` |

Reuses `product:manage` — the same permission `SetNewPrice` already uses
on this same page. No new permission.

## Schema

```prisma
model Cost {
  id            String    @id @default(cuid())
  productId     String
  product       Product   @relation(fields: [productId], references: [id])
  amountPerKg   Decimal
  effectiveFrom DateTime  @default(now())
  effectiveTo   DateTime?
  createdById   String
  createdAt     DateTime  @default(now())
  @@index([productId, effectiveFrom])
  @@map("cost")
}
```

`Product` gains a `costs Cost[]` relation field. `SetNewCost` closes off
the previous open-ended `Cost` row (`effectiveTo = now()`) before creating
the new one — identical logic to `SetNewProductPrice`, not a new pattern.

`Sale` gains one new field:

```prisma
model Sale {
  // ...existing fields unchanged...
  costPerKgAtSale Decimal? // snapshot of the active Cost.amountPerKg at sale time; null if none was ever set
}
```

Populated by `POST /api/v1/sales` the same way `unitPriceAtSale` is
looked up today — an additional read of the active `Cost` row for that
product inside the same handler, not a new mutation path. `null` simply
means margin isn't computable for that one sale; it is not an error and
does not block the sale.

## API routes

REST: `api/v1/products/[id]/costs` (GET list — paginated, mirrors
`api/v1/products/[id]/prices`; POST — set new cost, closes the previous
row). `POST /api/v1/sales`'s existing handler gains one additional lookup
(the active `Cost` for `productId`) to populate `costPerKgAtSale` —
no new route.

## Feature folders

- `src/features/products/` — cost service/hooks/components alongside the
  existing price ones (`use-costs.ts`, `cost-history.tsx`,
  `set-cost-form.tsx`, closely mirroring `use-prices.ts`/
  `price-history.tsx`/`set-price-form.tsx`)

## Out of scope

- **No automatic cost derivation from Epic 14's raw-material recipe.**
  Cost is a direct Manager-entered number (their own COGS estimate),
  deliberately decoupled from material-consumption math. Deriving cost
  live from recipe × material cost would make margin reporting hard-depend
  on every product having a complete, accurate recipe *and* every raw
  material having its own cost-over-time history — a second mirrored
  `Price`-like model this epic doesn't also want to build. Revisit later
  if manual cost entry turns out to be unreliable in practice.
- No backfill of `costPerKgAtSale` on existing historical `Sale` rows —
  it stays `null` for every sale recorded before this epic ships;
  Epic 17's profitability totals account for that (see its own "Out of
  scope"/tile-footnote note).

## Open questions

None.
