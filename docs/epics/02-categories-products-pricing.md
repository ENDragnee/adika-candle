# Epic 2 — Categories + Products + Pricing

**Depends on:** 1 (Foundation/Shell)
**Status:** done

## Goal

Manager can define what's sellable and at what price, with full price
history (pricing is variable over time — never a single current-price
field, per `AGENTS.md`).

## Pages & permissions

| Route | Notes | Permission |
|---|---|---|
| `/manager/categories` | list + create/edit/deactivate | `category:manage` |
| `/manager/products` | list | `product:read` |
| `/manager/products/new` | create | `product:manage` |
| `/manager/products/[id]` | detail + price-history tab + "set new price" action | `product:read` (view) / `product:manage` (edit, set price) |

## Schema

```prisma
model Category {
  id          String    @id @default(cuid())
  name        String    @unique
  description String?
  isActive    Boolean   @default(true)
  products    Product[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  @@map("category")
}

model Product {
  id         String   @id @default(cuid())
  name       String
  sku        String   @unique   // via existing GenerateCode() in src/lib/generate-code.ts
  isActive   Boolean  @default(true)
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id])
  prices     Price[]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@map("product")
}

model Price {
  id            String    @id @default(cuid())
  productId     String
  product       Product   @relation(fields: [productId], references: [id])
  amountPerKg   Decimal
  effectiveFrom DateTime  @default(now())
  effectiveTo   DateTime?          // null = currently active
  createdById   String
  createdAt     DateTime  @default(now())
  @@index([productId, effectiveFrom])
  @@map("price")
}
```

"Set new price" closes the prior active `Price` row (`effectiveTo = now()`)
and inserts a new one in the same transaction — never mutates an existing
row's `amountPerKg`.

Note: `Product.stockBalance`, `stockLedgerEntries`, and `sales` relations
are added in Epics 4 and 6 respectively — don't add those fields here,
they belong with the models that need them.

## API routes

REST (CRUD tied to a form, per the REST/GraphQL convention in
`docs/DECISIONS.md`):

- `api/v1/categories` (GET list, POST create), `api/v1/categories/[id]` (PATCH, DELETE/deactivate)
- `api/v1/products` (GET list, POST create), `api/v1/products/[id]` (GET detail, PATCH)
- `api/v1/products/[id]/prices` (GET history, POST set new price)

## Feature folders

- `src/features/categories/`
- `src/features/products/` — pricing folded in as a sub-concern (service +
  hooks for prices live alongside product service, not a separate
  `src/features/pricing/`), per the plan's "don't build a disconnected
  pricing screen" framing.

## Out of scope

- Stock, units, sales — products exist but can't be stocked or sold yet.
- Response-shape Zod validation on these routes is a good place to
  establish the `responseSchema` convention mentioned in Epic 1's parent
  plan, if Epic 1 didn't already add it to `IApiHandlerConfig`.

## Open questions

None.
