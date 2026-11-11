# Epic 5 — Customers + Loans

**Depends on:** 1 (Foundation/Shell)
**Status:** done

## Goal

Manager manages the customer list and has full loan oversight, manual
adjustment, and the ledger view. Both roles can record a stand-alone loan
repayment that isn't tied to a new sale (resolves the "repayment without a
sale" gap identified during planning — binding decision: both roles get
this, not Manager-only).

## Pages & permissions

| Route | Notes | Permission |
|---|---|---|
| `/manager/customers` | list + create/edit/deactivate | `customer:manage` |
| `/manager/customers/[id]` | profile + loan ledger + manual adjustment + repayment | `customer:manage` + `loan:manage` |
| `/manager/loans` | cross-customer oversight queue | `loan:manage` |
| `/inventory/customers` | directory + balance lookup (read) | `customer:read` |
| `/inventory/customers/[id]` | ledger + "Record Repayment" action | `customer:read` + `loan:record` |

## Schema

```prisma
model Customer {
  id          String   @id @default(cuid())
  name        String
  phone       String?
  location    String?           // e.g. "Merkato" — free text, not an enum; Manager adds customers freely
  isActive    Boolean  @default(true)
  loanAccount LoanAccount?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@map("customer")
}

model LoanAccount {
  id           String            @id @default(cuid())
  customerId   String            @unique
  customer     Customer          @relation(fields: [customerId], references: [id])
  balance      Decimal           @default(0)  // + = customer owes business, - = business owes customer
  transactions LoanTransaction[]
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
  @@map("loan_account")
}

enum LoanTransactionType {
  SALE_ON_CREDIT         // IM sells, customer doesn't pay now — created by Epic 6, not this epic
  REPAYMENT_RECEIVED      // customer pays down what they owe
  ADVANCE_FROM_CUSTOMER   // customer lends business money/items ahead of a purchase
  ADVANCE_REDEEMED        // that advance applied against a later sale — created by Epic 6, not this epic
  MANUAL_ADJUSTMENT       // manager-only correction
}

model LoanTransaction {
  id            String              @id @default(cuid())
  loanAccountId String
  loanAccount   LoanAccount         @relation(fields: [loanAccountId], references: [id])
  type          LoanTransactionType
  amount        Decimal             // positive magnitude; direction implied by type
  balanceAfter  Decimal             // denormalized snapshot
  note          String?
  saleId        String?             @unique   // back-ref added in Epic 6; nullable until then
  createdById   String
  createdAt     DateTime            @default(now())
  @@index([loanAccountId, createdAt])
  @@map("loan_transaction")
}
```

`LoanAccount.balance` sign convention (+ = customer owes the business, − =
business owes the customer) must be respected consistently in every UI
built against it — see `docs/DECISIONS.md`.

`Customer.sales` relation field gets added in Epic 6.

## API routes

REST: `api/v1/customers` (GET list, POST create), `api/v1/customers/[id]` (GET, PATCH), `api/v1/loans` (GET — Manager oversight list across all accounts), `api/v1/loans/[accountId]/transactions` (POST — covers `MANUAL_ADJUSTMENT`, `REPAYMENT_RECEIVED`, `ADVANCE_FROM_CUSTOMER`; permission-gates `MANUAL_ADJUSTMENT` to Manager only, the other two to either role).

## Feature folders

- `src/features/customers/`
- `src/features/loans/`

## Out of scope

- `SALE_ON_CREDIT` and `ADVANCE_REDEEMED` transaction types exist in the
  enum but **nothing creates them in this epic** — that wiring is Epic 6's
  job (sale-triggered loan transactions). This epic only builds the paths
  that don't require a `Sale`: manual adjustment, stand-alone repayment,
  stand-alone advance.

## Open questions

None — repayment access was resolved as a binding decision (both roles).
