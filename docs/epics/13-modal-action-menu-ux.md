# Epic 13 — Modal & Action-Menu UX

**Depends on:** 9 (Design System Foundation)
**Status:** done

## Goal

Replace three UX patterns that have been "good enough since Epic 2" with
a consistent, deliberate one: permanently-visible create forms sitting
above every table, in-place row editing that swaps table cells for
inputs, and destructive actions (`Deactivate`) that fire immediately on
click with no confirmation. This epic introduces a `Dialog`-based modal
for every create/edit flow in a list context, a single per-row "..."
action menu (reusing the `DropdownMenu` primitive already built for the
account menu) in place of always-visible button pairs, and a new
`AlertDialog` confirmation step before any deactivation.

**Terminology, settled up front rather than left ambiguous:** "action
menu" means the per-row "..." trigger opening a `DropdownMenu` with that
row's actions (Edit / Activate / Deactivate) — not a literal right-click
context menu. A real right-click `ContextMenu` was considered and
rejected: it's not a pattern this app's users (factory staff on a
business admin tool) would expect to discover, and it would just
duplicate the same actions the "..." menu already exposes. If a literal
right-click menu is actually wanted, that's a different, smaller
follow-up, not part of this epic.

## Scope

**New primitive:** `src/components/ui/alert-dialog.tsx` — Radix
`AlertDialog` (confirmation can't be dismissed by an outside click/Esc
the way `Dialog` can; Radix draws this distinction deliberately), styled
like the existing `dialog.tsx` (`rounded-lg bg-popover ring-1
ring-foreground/10`). Title + description + Cancel/Confirm buttons, the
Confirm button using `Button`'s existing `destructive` variant. Reused
everywhere below — not a one-off per feature.

**Row actions → one action menu.** The 4 composed-table files
(`category-manager.tsx`, `customer-manager.tsx`,
`unit-conversion-manager.tsx`, `user-manager.tsx`) currently render
`Edit`/`Deactivate`(/`Activate`) as always-visible buttons in an
"Actions" `TableCell`. Replace with a single icon-only button
(`DotsThreeIcon` or similar) opening a `DropdownMenu`:
`DropdownMenuItem`s for "Edit" (opens the edit modal below) and
"Activate"/"Deactivate" (Deactivate routes through the new
`AlertDialog`; Activate stays a direct action — reversible, low-risk,
no confirmation needed, matching how `Activate` already behaves today).

**Create flows → modals**, opened by the existing "Add X" buttons
(already `PlusIcon`-led from Epic 12) instead of an inline form Card
permanently sitting above the table:
- `CreateCategoryForm`, `CreateCustomerForm`, `CreateUnitConversionForm`,
  `CreateUserForm` (`category-manager.tsx`, `customer-manager.tsx`,
  `unit-conversion-manager.tsx`, `user-manager.tsx`) each move into a
  `Dialog` triggered by their "Add X" button. `CreateUserForm`'s
  post-create temporary-password banner is unaffected — the modal
  closes on success and the banner still renders above the table exactly
  as it does today.
- `SetPriceForm` (`product-detail.tsx`'s price-history tab) moves into a
  modal opened by a new "Set new price" button next to `PriceHistory`'s
  heading, replacing the always-visible compact form.
- `RepaymentForm` and `ManualAdjustmentForm` (`customer-ledger-view.tsx`,
  `customer-profile.tsx`) each move into a modal opened by a "Record
  repayment" / "Record adjustment" button, replacing the two
  permanently-rendered side-by-side Cards.

**Edit flows → modals:**
- `CategoryRow`/`CustomerRow`/`UnitConversionRow`/`UserRow`'s inline
  `isEditing` state (swapping `TableCell` content for `Input`s in place)
  is replaced by an Edit modal opened from the row's new action menu —
  the row itself goes back to pure display, no more conditional render
  branch per row.
- `ProductOverview`'s (`product-detail.tsx`) in-place edit toggle becomes
  an Edit modal opened by its existing `Edit` button; `Deactivate` routes
  through the new `AlertDialog`.

**Explicitly NOT converted to modals** — these are dedicated,
deep-linkable pages that are the primary reason a user navigates to that
route, not ancillary CRUD on a list:
- `CreateProductForm` (`/manager/products/new`)
- `AcceptStockForm` (`/inventory/stock/accept`)
- `RecordSaleForm` (`/inventory/sales/new`)

Turning these into modals would be a navigation-model change (no longer
bookmarkable/linkable as their own route), not a mechanical application
of this epic's pattern — out of scope here.

## Schema

None.

## API routes

None new — every mutation this epic touches already exists
(`useCreateCategory`, `useUpdateCategory`, `useDeactivateCategory`, and
the equivalent create/update/deactivate hooks for customers, units,
users, and products). This epic only changes how those hooks are
triggered from the UI.

## Feature folders

- `src/components/ui/` (new `alert-dialog.tsx`; `dialog.tsx` and
  `dropdown-menu.tsx` already exist, built in Epic 9 and the
  account-menu work respectively)
- `src/features/categories/components/category-manager.tsx`
- `src/features/customers/components/customer-manager.tsx`
- `src/features/unit-conversions/components/unit-conversion-manager.tsx`
- `src/features/users/components/user-manager.tsx`
- `src/features/products/components/product-detail.tsx`,
  `set-price-form.tsx`
- `src/features/customers/components/customer-ledger-view.tsx`,
  `customer-profile.tsx`
- `src/features/loans/components/repayment-form.tsx`,
  `manual-adjustment-form.tsx`

See `docs/DECISIONS.md` for the final file list and any non-obvious
decisions once implemented, rather than enumerating every path here.

## Out of scope

- No behavior/permission/validation changes — every create/edit/
  deactivate mutation keeps its exact current inputs and server-side
  logic; this epic only changes the trigger/presentation layer.
- No change to the 3 dedicated-page flows listed above.
- No literal right-click `ContextMenu` — see Terminology above.
- No changes to `DataTable<T>`'s 8 read-only list consumers
  (`product-list.tsx`, `sale-list.tsx`, etc.) — they have no row actions
  to consolidate (no edit/deactivate on those rows today).
- No exhaustive route-by-route QA pass — verification is a representative
  spot-check (one composed table's create+edit+deactivate flow, one
  modal-converted standalone form, light/dark, desktop/mobile), matching
  Epic 9/12's verification approach.

## Open questions

- Icon choice for the row action-menu trigger (`DotsThreeIcon` vertical
  vs. horizontal, size) — an implementation detail, not worth blocking
  on; pick one consistent with the existing `Button` `icon-sm` sizing
  used elsewhere (e.g. `AccountMenu`'s avatar trigger) and log the choice
  to `docs/DECISIONS.md` rather than deciding it here.

See `docs/DECISIONS.md` (2026-11-08, "Epic 13 decisions") for the final
file list and the non-obvious calls made while implementing this epic.
