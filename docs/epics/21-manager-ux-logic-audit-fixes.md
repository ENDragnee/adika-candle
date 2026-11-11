# Epic 21 — Manager UX & Logic Audit Fixes

**Depends on:** 8, 13, 15, 17 (all done)
**Status:** done

## Goal

Fix the problems found in the 2026-11-11 audit of the Manager area
(`/manager/*`), both by walking every page in the running app as the
seed `manager` user and by reading the server logic behind each number.
There are two kinds of problem:

1. **Numbers that are wrong or misleading.** The page shows a figure that
   doesn't mean what a factory manager would think it means.
2. **Presentation and flow gaps.** The data is correct, but it shows up
   as raw enums, unsigned amounts, or numbers with no unit, or the
   manager has no way to act on what they see.

Items are grouped by priority. **P0 items must land first**: they
currently show wrong business figures. Each item gives the evidence
(file or screen), the fix, and an acceptance check.

---

## P0 — Wrong or misleading numbers

### 0.1 Profitability counts sales with no cost as 100% profit

**Evidence.** `BuildProfitability` (`src/app/api/graphql/route.ts:568`)
adds *every* sale to `totalRevenue` but adds cost only for sales with a
`costPerKgAtSale`. Then `totalProfit = totalRevenue - totalCost`. In the
running app, with 5 sales and no cost data, the tab shows **Total profit
6,050 and Average margin 100.0%**. The per-day margin trend has the same
bug, and so does the per-product `totalProfit` whenever a product has a
mix of costed and uncosted sales.

**Fix.** Compute profit and margin from *costed sales only*. Track
`costedRevenue` next to `totalRevenue`. Then `totalProfit = costedRevenue
- totalCost` and `averageMarginPercent = totalProfit / costedRevenue`.
Do the same per day and per product. When `costedRevenue = 0`, return
`null` for margin and profit instead of `"0"`/`100%`. The UI then shows
"—" with the caption "No cost data for this period". Add `costedRevenue`
to the GraphQL type and the Zod schema.

**Accept.** With zero costs set, the profit and margin tiles show "—",
not 100%. Add a unit test for the resolver math that mixes costed and
uncosted sales.

### 0.2 Per-product margin mixes "today's price/cost" with "period profit"

**Evidence.** The same table shows `marginPercent` from the *current*
active Price/Cost (`route.ts:659-682`) next to `totalProfit` from
*historical* sale snapshots. If prices changed during the window, the
two columns contradict each other.

**Fix.** Calculate the row's margin % as realized margin from the
snapshots (`(costedRevenue - cost) / costedRevenue`). Keep current
price/cost as separate, clearly labelled columns ("Current price / kg",
"Current cost / kg").

### 0.3 Margin trend plots "no sales" days as 0% margin

**Evidence.** `route.ts:647-654` returns `"0"` for days with no revenue.
On the chart these read as days with 0% margin.

**Fix.** Return `null` for days with no costed revenue. The
`TrendLineChart` should skip null points (gap or no dot) instead of
dropping to 0.

### 0.4 Stock can go negative, and the UI treats that as normal

**Evidence.** The Dashboard, Stock, Production and Stock Health views
all show `Epic6 Test Candle` at **-10 kg**. Stock Health shows
**"Days of cover -5.0"**. The Production report shows **Opening Stock
-10**. Negative stock was allowed on purpose (DECISIONS.md, Epic 6
"No guard against selling more stock…"), but nothing tells the user
it's an anomaly.

**Fix (needs a product decision, see "Open questions").** Minimum
version:
- Server: `POST /api/v1/sales` returns a **warning** in the response
  (not an error) when the sale takes the balance below 0. The Record Sale
  dialog shows available stock next to the quantity field and asks for
  confirmation before it oversells.
- `daysOfCover` is `null` when `quantityKg <= 0` (stock-health resolver,
  `route.ts:786`).
- Show negative balances in a destructive color with a "Negative: needs
  a stock count" badge, and add a separate **NEGATIVE** status bucket in
  Stock Health instead of folding them into "Out of stock".

### 0.5 The Dashboard and Stock Health disagree on what "low stock" means

**Evidence.** For the same data, the Dashboard says **1 low-stock
alert** and Stock Health says **4 Out of stock**. The Dashboard
(`BuildStockSections`) only alerts on products that *have a threshold*.
Stock Health counts every active product at ≤ 0 as Out of stock. A
product with no threshold and 0 kg also reads as "Healthy" in Stock
Health once it has any stock at all (`route.ts:765-769`), so "Healthy"
really means "unknown".

**Fix.** Move status into one shared `ClassifyStock(quantity,
threshold)` helper that both resolvers use. Add a `NO_THRESHOLD` status
("Not tracked") instead of defaulting to HEALTHY. Make the Dashboard
"Low-stock alerts" tile count `OUT_OF_STOCK + CRITICAL + LOW` (plus
NEGATIVE), and link the tile to Analytics → Stock Health filtered to
those statuses.

### 0.6 Production report "Opening" ignores ADJUSTMENT entries

**Evidence.** `opening = closing - received + consumed`
(`route.ts:448, 484`) only subtracts RECEIVED/ACCEPT and adds back
CONSUMED/SALE. Any ADJUSTMENT ledger entry in the period (the enum
already exists for both ledgers, and 1.1 below adds a UI for it) makes
the opening figure wrong.

**Fix.** Back out *all* signed ledger movement in the period:
`opening = closing - Σ(signed quantity in period)`. Better still, read
`balanceAfterKg` from the last ledger entry before `period.start`. Show
an **Adjustments** column when any exist so the row still adds up
(Opening + Received − Consumption ± Adjustments = Closing).

### 0.7 Balance updates can lose writes under concurrent requests

**Evidence.** Sales, stock accept, raw-material activity and loan
transactions all do read → compute → `update({ quantityKg: computed })`
inside `$transaction` (e.g. `sales/route.ts:180-192`,
`loans/[accountId]/transactions/route.ts:105-115`). Under Postgres READ
COMMITTED, two concurrent sales of the same product can both read 100 kg
and both write 90 kg. The cached balance then drifts from the ledger.

**Fix.** Use atomic `update({ data: { quantityKg: { increment: delta } } })`
and take `balanceAfter` from the returned row (or `SELECT … FOR UPDATE`
via `$queryRaw` first). Apply this in all four write paths. Add a
`pnpm` script or test that checks cached balance == last ledger
`balanceAfter` for every product, material and loan account.

### 0.8 Day buckets use UTC; the factory runs on local time (UTC+3)

**Evidence.** Every analytics resolver buckets by
`toISOString().slice(0,10)` / `setUTCHours(0)`, but the UI shows times
with `toLocaleString()`. A sale at 01:30 local time lands on the
*previous* day in the trend, the Production "Day" report and margin
trend. Best Sellers uses a rolling `now - days` window while the
other tabs use midnight-aligned windows.

**Fix.** Add `BUSINESS_TIMEZONE = "Africa/Addis_Ababa"` to
`src/configs/global-vars.ts`. Compute period starts and day keys in that
zone (`Intl.DateTimeFormat` with `timeZone` is enough, no new
dependency). Align Best Sellers to the same midnight-aligned windows.

---

## P1 — Missing operations (the manager can see a problem but can't fix it)

### 1.1 No way to correct stock or raw-material balances

`StockEntryType.ADJUSTMENT` and `RawMaterialEntryType.ADJUSTMENT` exist,
but nothing writes them. `/manager/stock` and `/manager/materials` are
read-only. The -10 kg above can't be corrected without a fake "Accept".

**Fix.** Add a Manager-only **"Adjust / stock count"** dialog on
`/manager/stock/[productId]` and `/manager/materials/[materialId]`.
The input is "Counted quantity (kg)" plus a required reason. The server
computes the delta and writes an ADJUSTMENT ledger entry. Add a new
`stock:adjust` permission (seeded to Manager). Follow the loan
`MANUAL_ADJUSTMENT` pattern.

### 1.2 No way to void or correct a sale

A wrong sale (wrong product, quantity or customer) is permanent. It has
already moved stock and possibly a loan balance.

**Fix.** Add a Manager-only **Void sale** action (row menu on
`/manager/sales` plus a sale detail sheet). It adds a `voidedAt` /
`voidedById` / `voidReason` to `Sale`, writes reversing ledger entries
(a stock ADJUSTMENT +kg, and a loan MANUAL_ADJUSTMENT −amount for LOAN
sales) in one transaction, and excludes voided sales from every
analytics aggregate. Never hard-delete. Use the AlertDialog confirmation.

### 1.3 `ADVANCE_REDEEMED` is never written; advances are indistinguishable from repayments

Both `REPAYMENT_RECEIVED` and `ADVANCE_FROM_CUSTOMER` just decrease the
balance. When a customer with credit (negative balance) buys on LOAN,
the sale writes `SALE_ON_CREDIT`, never `ADVANCE_REDEEMED`. The ledger
then reads as "customer went into debt" when the customer actually
spent their advance.

**Fix.** In the LOAN branch of `POST /api/v1/sales`, if the
pre-sale balance is negative, split the posting: `ADVANCE_REDEEMED` for
`min(total, |balance|)` and `SALE_ON_CREDIT` for any remainder. In the
UI, rename the payment option "On account" and show the customer's
current balance ("Has 500 credit" / "Owes 2,000") in the Record Sale
dialog when a customer is picked.

### 1.4 Server accepts sales/stock for inactive products and customers

Called out as deliberate in DECISIONS.md (Epic 6), but the
UI-only filter is easy to get around, and a deactivated product can
still be sold from a stale tab.

**Fix.** Reject with 400 "Product is inactive" / "Customer is inactive"
in `sales` and `stock/accept`.

### 1.5 The Roles matrix can lock the Manager out, and some permissions do nothing

- Nothing stops a Manager from turning off `role:manage` (or
  `analytics:read`, etc.) on the **Manager** role. This is the same
  self-lockout risk that `users/[id]` already guards against.
- Area access is gated by **role name** (`manager/layout.tsx`,
  `inventory/layout.tsx`, `nav-config.ts`), not by permissions.
  Turning on "View analytics" for Inventory Manager has no effect,
  because they can never reach `/manager/analytics` and their nav has no
  link to it. The matrix promises more than it does.

**Fix.** (a) Server-side: block removing `role:manage` from the role of
the current user. In the UI, show those switches as locked with a
tooltip. (b) Either filter nav items by permission and gate pages by
permission only (preferred), or mark permissions that only matter
inside an area the role can't reach as "Has no effect for this role"
and disable them.

---

## P2 — Presentation: numbers people can actually read

### 2.1 No currency, no thousands separators, inconsistent precision

Money shows as bare `6050`, `2225`, `105` everywhere except the
Profitability tiles (`6,050`). The app has no shared formatter, and
`FormatDateTime` is copy-pasted into 8 files.

**Fix.** Add `src/lib/format.ts` with `FormatMoney` (ETB, e.g.
"ETB 6,050.00", currency code in `global-vars.ts`), `FormatKg`
("1,250.5 kg", max 2 dp), `FormatPercent`, `FormatDateTime`, and
`FormatRelative` ("3 days ago"). Replace every ad-hoc
`toLocaleString`/raw string render in `src/features/**`. CSV export
keeps raw numbers; the PDF uses the formatted ones.

### 2.2 Raw enums shown to users

Seen in the running app: `REPAYMENT_RECEIVED`, `ADVANCE_FROM_CUSTOMER`,
`MANUAL_ADJUSTMENT` (customer ledger), `CASH`/`LOAN` (sales),
`INVENTORY_MANAGER`/`MANAGER` (users list), `CARTON-E6` (units), and
ACCEPT/SALE/ADJUSTMENT (stock ledger).

**Fix.** Add one label map per enum next to its schema (e.g.
`LOAN_TRANSACTION_LABELS` in `loan.schema.ts`). Render it as a `Badge`
with a color by direction. Role names use `Role.description` or a
label map.

### 2.3 Loan amounts have no direction

The ledger shows `Amount 50` for both money in and money out, and
balances show `225` with no hint of who owes whom. The sign convention
(+ = customer owes us) is invisible to the user.

**Fix.** Show signed amounts (`+500` / `−200`) colored by effect. Show
balances as words: **"Owes you ETB 225"** / **"You owe ETB 500
(credit)"** / "Settled". Use this on the Customers list, customer
detail, Loans page and Dashboard.

### 2.4 Charts have no value axis or tooltips

The Sales trend (Dashboard), Production trend and Margin trend have no
Y-axis labels or hover values. The Dashboard sales chart also renders
blank until it is scrolled into view, so on load it looks like there's
no data.

**Fix.** Add a 3-tick Y axis and a hover/focus tooltip (date, value,
count) to `SalesTrendChart`, `TrendLineChart` and `RankedBarChart`.
Start the entrance animation when the chart mounts if it's already in
the viewport.

### 2.5 Leaked developer language

- `profitability-tab.tsx:125`: "recorded before Epic 15".
- `recipe-editor.tsx:240`: "Used by Epic 17's expected-output report".
- "Never" as a "Last updated" value on Stock/Materials. Use "No
  activity yet".

**Fix.** Rewrite in plain language (e.g. "5 sales had no cost set when
they were recorded, so they're left out of profit and margin").

---

## P3 — Information architecture & flow

### 3.1 Three pages show the same loan list

Dashboard "Loan exposure", `/manager/loans`, and the "Loan balance"
column on `/manager/customers` all show the same rows. `/manager/loans`
adds nothing: no actions, no aging, no filter.

**Fix.** Make `/manager/loans` the real receivables view: filter
(Owes us / Has credit / Settled), "last payment" date, days since last
payment, row actions (Record repayment, Adjust), and totals in the
header (owed to us vs. we owe). Cut the Dashboard section to the top 5
debtors plus a "View all" link.

### 3.2 Product detail is missing the facts a manager needs

The Details tab shows name/SKU/price/threshold, but **not** stock on
hand, current cost, margin, or recent sales. To answer "how is this
product doing?" the manager has to visit Stock, Analytics and Sales.

**Fix.** Add a summary strip to the product detail page: On hand (kg,
with status badge), Price/kg, Cost/kg, Margin %, Sold last 30 days. Add
a "Sales" tab (the sales list filtered by `productId`, which needs a new
`productId` filter on `GET /api/v1/sales`). Link to the stock ledger.

### 3.3 Sales list can't be filtered or summed

`/manager/sales` has no date range, product, customer or payment-type
filter, no kg column, no "recorded by", no totals, and the table
scrolls sideways at normal laptop widths.

**Fix.** Add filters (date range preset: Today / 7d / 30d / custom;
product; customer; payment type) as query params on `GET
/api/v1/sales`, a totals row (count, kg, amount, of which on account),
and a "Recorded by" column. Fold the unit into the Quantity cell
("1 carton · 10 kg") to remove the horizontal scroll.

### 3.4 Inconsistent page headers

`/manager/products` shows "Products" twice (TopBar and an in-page h1
with its own description). Sales, Stock and Customers use only the
TopBar description. Detail pages (`/manager/products/[id]`,
`/manager/customers/[id]`) have no back link or breadcrumb.

**Fix.** Use one pattern: the TopBar carries title + description,
and actions sit in a right-aligned page toolbar. Add the planned
`Breadcrumbs` slot (the `usePageTitle` store was built for it) to
every `[id]` page.

### 3.5 No search or sort on list pages

Products, Customers, Stock and Materials lists have no search box and
no column sorting. That's fine with 4 rows and painful with 200.

**Fix.** Add a `searchable` / `sortable` option to `DataTable`. Backed
by a `q` param on the REST list endpoints, because they are paginated
server-side.

### 3.6 Dashboard doesn't answer "what needs my attention today?"

The Dashboard shows a 30-day total, a chart and three long tables. It
doesn't show today's sales, today's cash vs. on-account split,
negative-stock items, or products with no price (which can't be sold:
see `Modal Test Product`/`Test2` with price "—").

**Fix.** Tiles: Today's sales (with Δ vs. yesterday), Cash collected
today, Owed to us, Needs attention (count). Add a **Needs attention**
list: negative stock, below threshold, active product with no price,
active product with no cost, debtors with no payment in 30+ days. Each
row links to the page where it can be fixed. Replace the full "Stock
levels" table with a link to Stock Health.

### 3.7 Price/cost changes take effect instantly with no confirmation

"Set new price" closes the old price and starts the new one
immediately, with no confirmation and no preview of the change.

**Fix.** The confirm step shows "105 → 120 / kg (+14.3%)". It also
shows the new margin when a cost is set.

---

## Decisions taken (were open questions)

1. **Overselling:** soft block — the API refuses with `409
   INSUFFICIENT_STOCK` unless the sale is explicitly confirmed
   (`allowOversell`), and the stock count (1.1) corrects the balance
   afterwards. A hard block would stop real sales on a bad count.
2. **Currency:** ETB, 2 decimals (`BUSINESS_CURRENCY` in
   `src/configs/global-vars.ts`).
3. **Void vs. edit:** void + re-record only; sales are never edited or
   deleted.
4. **Roles:** permission-only gating (1.5b). The `/manager` and
   `/inventory` route areas stay; nav and access follow permissions.

See `docs/DECISIONS.md`, "Epic 21 decisions", for the reasoning.

## Suggested build order

0.1–0.3 → 0.5 → 0.7 → 0.8 → 2.1 + 2.2 + 2.3 (one shared formatting
pass) → 1.1 → 0.4 + 0.6 → 1.2 → 1.3 → 1.4 → 1.5 → 2.4 + 2.5 → 3.x.

## Acceptance (epic-level)

- Every resolver change in P0 has a Vitest unit test with mixed
  fixtures (costed/uncosted, negative stock, adjustments, a sale at
  00:30 local time).
- No raw enum, unformatted money value, or "Epic N" string is reachable
  in `/manager/*` (spot-check every page in the running app).
- `pnpm test` and `pnpm lint` pass. Record each decision in
  `docs/DECISIONS.md` under a dated "Epic 21" heading.
