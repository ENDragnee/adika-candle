# Epic 19 — Legend & Walkthrough Reference Page

**Depends on:** 3 (Unit Settings), 4 (Stock), 5 (Customers + Loans), 14
(Raw Materials & Production Tracking), 17 (Analytics Hub)
**Status:** not-started

## Goal

A static, in-app reference page explaining this app's domain terminology
and ledger/report concepts, written for the factory staff who already
fill out the paper "Daily Stock Report" (`idea-boards/old-report-papers.jpg`,
referenced extensively by Epics 14 and 17) and need to map that mental
model onto the app's screens. Content is authored statically in the
codebase (a sectioned data array or plain JSX), **not** database-backed
or Manager-editable — this is documentation shipped with the app, not a
CMS-managed resource.

## One shared route, no new permission

**Decision:** one route, `/legend`, at `src/app/(dashboard)/legend/page.tsx`
— a sibling of `manager/` and `inventory/`, not nested inside either. The
shared `src/app/(dashboard)/layout.tsx` already calls `GetSession()` (any
signed-in user, either role — it only branches on `session.user.role` to
pick which `navItems` array to hand `AppShell`) before rendering
`AppShell`/`TopBar`/`children`; `manager/layout.tsx` and
`inventory/layout.tsx` each add their *own* additional role check
(`session.user.role !== ROLES.MANAGER`/`INVENTORY_MANAGER` → redirect) on
top of that shared layout, scoped to their own subtree. A route placed
outside both subtrees inherits only the shared layout's plain
"signed in" check — exactly the gate this epic needs, with zero new
permission, zero new `CheckPermission` call, and zero duplication between
a `/manager/legend` and `/inventory/legend` copy. `export const instant =
false;` still applies (the page reads session indirectly through the
shared layout — the page component itself doesn't need to read it again
unless it wants `session.user.role` to conditionally show/hide a section,
which isn't required for a content-only page).

Both `MANAGER_NAV_ITEMS` and `INVENTORY_NAV_ITEMS`
(`src/components/shell/nav-config.ts`) get a new entry pointing at the
same `/legend` href (e.g. `{ label: "Legend", href: "/legend", icon:
BookOpenIcon }`) — a top-level sidebar/bottom-nav destination like every
other feature, not tucked into the avatar/account menu. It's reference
content a user navigates *to*, not an account action like the theme
switcher or sign-out that `AccountMenu` otherwise holds — a nav item is
the more discoverable and more consistent placement given every other
app destination already lives there.

`TopBar`'s nav-derived title will resolve to "Legend" automatically (no
`usePageHeader()` override needed) once the nav entry exists.

## Content outline

Organized by topic with an in-page table of contents (anchor links down
to each section — a long single-scroll page, not its own internal
tab/routing system; this is read occasionally, not navigated repeatedly).
At minimum:

1. **Daily Stock Report columns** — Opening Stock / Received / Consumption
   / Closing Stock, the same four column labels used verbatim in Epic
   17's Production tab and Epic 14's raw-material ledger, mapped back to
   the paper form factory staff already use.
2. **Sales: CASH vs LOAN, walk-in vs named customer** — `Sale.paymentType`
   (`CASH` | `LOAN`); `Sale.customerId` is nullable — `null` means
   walk-in, a named `Customer` record means a standing account (Merkato,
   Gondor, Moges, Mekele, etc.) that can carry a loan balance.
3. **Loan balance sign convention** — `LoanAccount.balance`: **positive
   means the customer owes the business**; negative means the business
   owes the customer (an unredeemed advance). Call this out explicitly —
   `docs/DECISIONS.md` (2026-11-07) notes it's easy to get backwards.
4. **Ledger entry types** — `StockEntryType` (`ACCEPT` / `SALE` /
   `ADJUSTMENT`) for finished goods, `RawMaterialEntryType` (`RECEIVED` /
   `CONSUMED` / `ADJUSTMENT`) for raw materials — same append-only-ledger
   + cached-balance shape, explained once and applied to both.
5. **Unit conversions** — Carton/Packet/Wax/Kir → KG, `UnitConversion`'s
   `ratioToKg`; explain that a sale/stock entry snapshots the ratio at
   the time of the transaction (`inputRatioToKg`), so editing a unit's
   ratio later never changes historical totals.
6. **Stock Health statuses** — the 5 buckets from Epic 17's Stock Health
   tab, with their actual trigger thresholds so this page doesn't drift
   from the real logic (`src/app/api/graphql/route.ts`,
   `STOCK_HEALTH_CRITICAL_RATIO = 0.5`, `STOCK_HEALTH_OVERSTOCKED_RATIO =
   3`, against `Product.lowStockThresholdKg`): **Out of stock**
   (quantity = 0), **Critical** (< 50% of threshold), **Low** (< 100% of
   threshold), **Healthy** (within 100%–300% of threshold, or no
   threshold set at all), **Overstocked** (> 300% of threshold).
7. **Manager vs Inventory Manager** — what each role can do, framed at
   the feature level (sales, stock, materials, loans, analytics, user/role
   management) rather than listing raw permission strings.

Exact prose and whether this is one long page vs. several anchor-linked
subsections is an implementation-time writing task, not a schema/API
decision — nothing above should block starting it.

## Schema

None — read-only reference content, no new tables.

## API routes

None — statically authored, no backend round-trip.

## Feature folders

- `src/features/legend/` (new) — the page's content data/components. A
  single feature folder is enough; this isn't complex enough to need
  sub-grouping the way `src/features/analytics/` does.

## Out of scope

- Not database-backed, not Manager-editable at runtime — a content change
  later means editing code, not a settings-page form.
- No search/filter within the page — it's short enough to scroll or use
  browser find.
- No localization — matches the rest of the app (English-only today).

## Open questions

None — route shape, permission gate, and nav placement are all decided
above directly from the existing `(dashboard)` layout structure, not left
for implementation time to re-derive.
