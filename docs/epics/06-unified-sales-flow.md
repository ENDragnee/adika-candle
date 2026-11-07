# Epic 6 — Unified Sales Flow

**Depends on:** 2 (Products/Pricing), 3 (Unit Settings), 4 (Stock), 5 (Customers/Loans)
**Status:** not-started

## Goal

The single "Record Sale" transaction — this is the convergence epic. One
form: pick product + quantity (in Carton/Packet/Wax/Kir, converted to KG
via Epic 3's helper), pick a customer or mark walk-in, choose cash or loan.
Submitting it decrements stock and optionally writes a loan transaction,
all inside one DB transaction. Per binding product decision: **no separate
disconnected stock-movement or loan-creation screen** — this is the only
place a sale is recorded.

## Pages & permissions

| Route | Notes | Permission |
|---|---|---|
| `/inventory/sales/new` | the unified Record Sale form | `sale:create` |
| `/inventory/sales` | own recent sales | `sale:read` |
| `/manager/sales` | read-only sales history/reporting across all | `sale:read` |

## Schema

```prisma
enum SalePaymentType {
  CASH
  LOAN
}

model Sale {
  id                String           @id @default(cuid())
  referenceCode     String           @unique   // via GenerateCode()
  productId         String
  product           Product          @relation(fields: [productId], references: [id])
  customerId        String?                    // null = walk-in
  customer          Customer?        @relation(fields: [customerId], references: [id])
  inputQuantity     Decimal
  inputUnitName     String                      // snapshot, e.g. "CARTON"
  inputRatioToKg    Decimal                      // snapshot of ratio used at sale time
  quantityKg        Decimal                      // inputQuantity * inputRatioToKg
  unitPriceAtSale   Decimal                      // snapshot of Price.amountPerKg
  totalAmount       Decimal                      // quantityKg * unitPriceAtSale
  paymentType       SalePaymentType
  createdById       String
  createdAt         DateTime         @default(now())
  stockLedgerEntry  StockLedgerEntry?
  loanTransaction   LoanTransaction?
  @@map("sale")
}
```

Also in this epic: add the `saleId` back-reference relations on
`StockLedgerEntry` and `LoanTransaction` (the columns were declared
nullable in Epics 4/5; this epic is what actually populates them) and add
`Product.sales` / `Customer.sales` relation fields.

`Sale`/`StockLedgerEntry` snapshot the unit ratio and price used at
transaction time rather than live-joining `UnitConversion`/`Price` —
editing a ratio or price later must never retroactively change historical
totals. See `docs/DECISIONS.md`.

`Sale` is single-product-per-transaction (no `SaleLine` child table) — see
`docs/DECISIONS.md` for why multi-item carts are explicitly deferred.

## API routes

REST: `api/v1/sales` — POST does the whole transaction in one DB
transaction:
1. Convert `inputQuantity`/`inputUnitName` → `quantityKg` via Epic 3's `convertToKg()`.
2. Snapshot the currently-active `Price.amountPerKg` for the product.
3. Insert `Sale`.
4. Insert a `SALE`-type `StockLedgerEntry` + decrement `StockBalance` (Epic 4's tables).
5. If `paymentType === LOAN`: insert a `SALE_ON_CREDIT` `LoanTransaction` +
   update `LoanAccount.balance` (Epic 5's tables).

`api/v1/sales/[id]` (GET detail).

## Feature folders

- `src/features/sales/` — the one form/mutation implementing the flow
  above. Imports `convertToKg()` from `src/features/unit-conversions/`,
  calls into `src/features/stock/` and `src/features/loans/` services for
  the ledger/balance writes rather than duplicating that logic.

## Out of scope

- Multi-product carts — explicitly deferred (see `docs/DECISIONS.md`); a
  future `SaleLine` migration would be a real schema change, not a UI
  tweak.

## Open questions

None.
