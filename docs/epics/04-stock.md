# Epic 4 — Stock

**Depends on:** 1 (Foundation/Shell), 2 (Products), 3 (Unit Settings)
**Status:** not-started

## Goal

Track real stock balances via an append-only ledger. Inventory Manager can
"accept" (receive) stock; Manager gets read visibility across all products.

## Pages & permissions

| Route | Notes | Permission |
|---|---|---|
| `/manager/stock` | balances across all products | `stock:read` |
| `/manager/stock/[productId]` | ledger detail for one product | `stock:read` |
| `/inventory/stock` | read-only balances | `stock:read` |
| `/inventory/stock/accept` | "Accept Stock" form (product, quantity + unit via Epic 3's `convertToKg`) | `stock:accept` |

## Schema

```prisma
enum StockEntryType {
  ACCEPT
  SALE
  ADJUSTMENT
}

model StockBalance {
  id          String   @id @default(cuid())
  productId   String   @unique
  product     Product  @relation(fields: [productId], references: [id])
  quantityKg  Decimal  @default(0)
  updatedAt   DateTime @updatedAt
  @@map("stock_balance")
}

model StockLedgerEntry {
  id               String         @id @default(cuid())
  productId        String
  product          Product        @relation(fields: [productId], references: [id])
  type             StockEntryType
  quantityKg       Decimal        // signed: + for ACCEPT/ADJUSTMENT-in, - for SALE/ADJUSTMENT-out
  balanceAfterKg   Decimal        // denormalized snapshot, written in the same tx as the balance update
  inputQuantity    Decimal?       // raw entered qty, pre-conversion (null for system-only adjustments)
  inputUnitName    String?        // snapshot of UnitConversion.unitName at entry time
  inputRatioToKg   Decimal?       // snapshot of the ratio used — not a live FK, see docs/DECISIONS.md
  note             String?
  saleId           String?        @unique   // back-ref added in Epic 6; nullable until then
  createdById      String
  createdAt        DateTime       @default(now())
  @@index([productId, createdAt])
  @@map("stock_ledger_entry")
}
```

Balance + ledger is a deliberate hybrid (cached `StockBalance.quantityKg`
+ audit-trail `StockLedgerEntry`), both updated in the same DB transaction
on every write. See `docs/DECISIONS.md`.

`Product.stockBalance` (1:1) and `Product.stockLedgerEntries` (1:many)
relation fields get added to the `Product` model in this epic.

## API routes

REST: `api/v1/stock` (GET balances, filterable by product), `api/v1/stock/accept` (POST — creates `ACCEPT` ledger entry + updates balance, one DB transaction), `api/v1/stock/[productId]/ledger` (GET history).

## Feature folders

- `src/features/stock/` — depends on Epic 3's `convertToKg()` helper from
  `src/features/unit-conversions/`.

## Out of scope

- **Stock decrement from a sale is explicitly not built here** — that's
  Epic 6's job, even though it writes into this epic's `StockLedgerEntry`/
  `StockBalance` tables. This epic only builds the inbound ("accept") side
  and read views. Do not add a sale-triggered decrement while implementing
  this epic.
- The `saleId` FK on `StockLedgerEntry` is declared here but stays null
  until Epic 6 populates it.

## Open questions

None.
