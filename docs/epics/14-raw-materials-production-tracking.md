# Epic 14 — Raw Materials & Production Tracking

**Depends on:** 1 (Foundation/Shell), 2 (Categories/Products/Pricing)
**Status:** done

## Goal

Model raw materials (wax, color dye, and anything else the factory tracks
as a production input) with the same append-only-ledger + cached-balance
pattern `Stock` already uses (see `docs/DECISIONS.md`, "Stock and loan
balances: cached column + append-only ledger"), so daily received/consumed
activity can be recorded — mirroring the factory's own existing paper
process. This epic is the data foundation Epic 17's Production tab reports
on; like Epic 4 (Stock) before Epic 8 (Analytics) existed, it ships a plain
balance/ledger CRUD with no reporting UI of its own beyond a list.

**Reference:** `idea-boards/old-report-papers.jpg` — a photo of the
factory's handwritten "Daily Stock Report." Columns, left to right: a
section label, **Opening Stock**, **Received**, **Consumption**, **Closing
Stock**. Sections on the page: **WAX** (sub-rows Palermo, Alex, Local ×2,
Iran — different wax sources/batches, all in KG, with a "Total in KG" row),
**FINISHED GOODS** / **PACKET** / **CARTOON** (sub-rows BI, ME, SM, CO,
Ash, MA, PL — repeated identically across all three sections, so these
read as product/color codes tracked at three packaging stages), and
**COLOR** (sub-rows Red, Blue, Yellow, Green, in KG). The FINISHED
GOODS/PACKET/CARTOON sub-rows are already representable with the existing
`Product`/`Category`/`StockLedgerEntry` models — "Received" there is an
`ACCEPT` entry, "Consumption" is a `SALE` entry, both of which already
exist. **This epic only models the WAX/COLOR-style rows** — true raw
material that gets consumed *into* a finished product, which has no
schema representation today at all. Epic 17 turns both sides (this
epic's raw-material ledger + the existing finished-goods ledger) into one
report shaped like the paper form.

## Pages & permissions

| Route | Notes | Permission |
|---|---|---|
| `/manager/settings/materials` | raw material catalog CRUD (name, isActive) + per-product recipe editor | `raw-material:manage` |
| `/manager/materials` | balances + ledger, read-only list (mirrors `/manager/stock`) | `raw-material:read` |
| `/inventory/materials` | balances + "Record activity" (Received/Consumed) | `raw-material:read` + `raw-material:record` |

`/manager/settings/materials` is linked from the existing
`/manager/settings` hub (`SETTINGS_LINKS`, per Epic 3's "future Manager
settings screens add their link here" convention), not a new top-level
nav item. `/manager/materials` and `/inventory/materials` *are* new
top-level nav items (`nav-config.ts`), mirroring `Stock`'s split between a
Manager read-only list and an Inventory Manager operational page.

## Schema

```prisma
model RawMaterial {
  id        String   @id @default(cuid())
  name      String   @unique   // e.g. "Wax - Local", "Color - Red" — free text, Manager-defined
  isActive  Boolean  @default(true)
  balance   RawMaterialBalance?
  ledgerEntries RawMaterialLedgerEntry[]
  materialRequirements ProductMaterialRequirement[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@map("raw_material")
}

enum RawMaterialEntryType {
  RECEIVED
  CONSUMED
  ADJUSTMENT
}

model RawMaterialBalance {
  id          String      @id @default(cuid())
  materialId  String      @unique
  material    RawMaterial @relation(fields: [materialId], references: [id])
  quantityKg  Decimal     @default(0)
  updatedAt   DateTime    @updatedAt
  @@map("raw_material_balance")
}

model RawMaterialLedgerEntry {
  id             String                @id @default(cuid())
  materialId     String
  material       RawMaterial           @relation(fields: [materialId], references: [id])
  type           RawMaterialEntryType
  quantityKg     Decimal               // always a positive magnitude; direction implied by type
  balanceAfterKg Decimal
  note           String?
  createdById    String
  createdAt      DateTime              @default(now())
  @@index([materialId, createdAt])
  @@map("raw_material_ledger_entry")
}

// Optional recipe/BOM row: "1kg of `product` requires `quantityKgPerOutputKg`
// kg of `material`." A product with no rows here just has no computed
// "expected output" in Epic 17 — never required for every product.
model ProductMaterialRequirement {
  id                   String      @id @default(cuid())
  productId            String
  product              Product     @relation(fields: [productId], references: [id])
  materialId           String
  material             RawMaterial @relation(fields: [materialId], references: [id])
  quantityKgPerOutputKg Decimal
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt
  @@unique([productId, materialId])
  @@map("product_material_requirement")
}
```

`Product` gains a `materialRequirements ProductMaterialRequirement[]`
back-relation field.

Materials are tracked directly in KG — no `UnitConversion` reuse. The
paper report's own WAX section already totals to a "Total in KG" row and
COLOR is already KG-denominated, so there's no Carton/Packet-style
conversion need on the input side the way finished-goods stock has.

## API routes

REST: `api/v1/raw-materials` (GET list, POST create), `api/v1/raw-materials/[id]`
(GET, PATCH — name/isActive), `api/v1/raw-materials/balances` (GET,
paginated, mirrors `GET /api/v1/stock`), `api/v1/raw-materials/[id]/activity`
(POST — discriminated union on `type: "RECEIVED" | "CONSUMED"`, mirrors
`CreateLoanTransactionInputSchema`'s shape; writes a ledger entry and
updates the balance in one `$transaction`), `api/v1/raw-materials/[id]/ledger`
(GET, paginated). `api/v1/products/[id]/material-requirements` (GET, POST,
PATCH — Manager-only recipe rows for one product).

## Permissions

New module `raw-material`: `raw-material:read`, `raw-material:record`
(both added to `INVENTORY_MANAGER_PERMISSIONS` in `prisma/seed.ts`,
mirroring `stock:read`/`stock:accept`), `raw-material:manage`
(Manager-only catalog + recipe CRUD, Manager already gets every
permission per the existing seed pattern).

## Feature folders

- `src/features/raw-materials/` (new)
- `src/features/products/` — small addition for the recipe/BOM editor
  (lives on the product detail page or the materials settings page;
  decide placement during implementation, not worth deciding here)

## Out of scope

- No change to existing `Stock`/`Sale` logic or schema.
- No requirement that every product have a complete recipe before this
  epic can ship — `ProductMaterialRequirement` is opt-in, best-effort.
- Follows Epic 13's modal + action-menu pattern directly for the
  catalog's create/edit/deactivate flow — do not reintroduce inline
  always-visible forms or in-place row editing.

## Open questions

Should `RawMaterialLedgerEntry` (`CONSUMED` specifically) optionally link
to a batch/production run, or stay a free-standing daily entry like
`StockEntryType.ADJUSTMENT`? Recommend free-standing for v1 — the paper
report itself is a daily aggregate, not per-batch — and revisit only if
Epic 17's variance report turns out to need tighter attribution than
"consumed this much on this day."
