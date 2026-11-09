# Epic 18 — Page Header Consolidation

**Depends on:** 9 (Design System Foundation)
**Status:** done

## Goal

Every page under `src/app/(dashboard)/**/page.tsx` still renders its own
`<h1>{title}</h1><p>{description}</p>` block inline, duplicating (or
slightly mismatching) the title `TopBar`
(`src/components/shell/top-bar.tsx`) already shows above it — built in the
2026-11-08 "Top bar, bigger components, and password visibility" round
(outside the epic sequence; see `docs/DECISIONS.md`). `TopBar`'s title
comes from nav-item matching by default, or a per-page override via
`usePageTitle()` (`src/components/shell/use-page-title.ts`, backed by a
small Zustand store at `src/components/shell/page-title-store.ts`).
`TopBar` has no description/subtitle slot at all today — only a title and
a "Welcome back, {name}" greeting on the right. This epic gives it one,
and removes every now-redundant inline heading that duplicates it.

## What changes

**Extend the page-title mechanism into a page-header mechanism carrying
both title and description:**

- `src/components/shell/page-title-store.ts` → `page-header-store.ts`:
  Zustand store gains a `description: string | null` field alongside
  `title`, with a `setHeader({ title, description })` setter. Same
  rationale as the original store (one consumer — `TopBar`, mounted once
  in `AppShell` — set by many independent page components, which React
  Context can't do without a provider per route).
- `src/components/shell/use-page-title.ts` → `use-page-header.ts`:
  `usePageTitle(title)` → `usePageHeader({ title?, description? })`. Same
  mount/unmount-clear semantics as today — sets on mount/when args change,
  clears both fields back to `null` on unmount so an override never leaks
  into the next page navigated to.
- New `src/components/shell/page-header.tsx`: a tiny `"use client"`
  component (`<PageHeader title={...} description={...} />`, both props
  optional) that just calls `usePageHeader` and renders `null`. Exists so
  the many **Server Component** `page.tsx` files that only need to set a
  *description* (title already matches the nav-derived default) can do so
  declaratively without becoming Client Components themselves — render
  `<PageHeader description="..." />` once at the top of the returned JSX,
  same spot the inline heading block used to sit.
- `TopBar` (`src/components/shell/top-bar.tsx`): reads `description` from
  the renamed store and renders it as a second line under the `<h1>`,
  truncated/clamped the same way the title already is. **Verify the
  mobile layout doesn't get crowded** — `TopBar` already stacks a small
  "Adika Candle" brand line above the title on narrow screens (`md:hidden`,
  replacing the old `MobileHeader`); adding a description makes that three
  stacked lines on mobile. Check a 375px screenshot before calling this
  done, per this repo's usual UI-change verification step; truncate to one
  line / consider a smaller text size if it crowds, but don't drop the
  description on mobile outright without checking first — the two already
  are low-height (`text-xs`/`text-lg`) and both exist on desktop too.

**Migrate the 6 existing dynamic `usePageTitle()` call sites** (all
Client Components) to `usePageHeader`, adding a `description` where one
is worth keeping (see per-file audit below):
`src/features/products/components/product-detail.tsx`,
`src/features/stock/components/product-stock-detail.tsx`,
`src/features/raw-materials/components/material-detail.tsx`,
`src/features/customers/components/customer-header.tsx`,
`src/features/unit-conversions/components/unit-conversion-manager.tsx`,
`src/features/raw-materials/components/material-manager.tsx`.

**Audit and remove every redundant inline heading.** Re-run
`grep -rn "text-lg font-semibold" "src/app/(dashboard)"` before starting —
this list is accurate as of this doc's writing but a prior session's own
work already touched several of these files, so don't trust it blindly:

- **16 flat list-page `page.tsx` files**, each with its own
  `<div><h1>{Label}</h1><p>{description}</p></div>` that exactly
  duplicates the nav-derived `TopBar` title (`manager/stock`,
  `manager/sales`, `manager/categories`, `manager/roles`, `manager/users`,
  `manager/customers`, `manager/loans`, `manager/materials`,
  `manager/analytics`, `manager/settings`, `manager/settings/units`,
  `manager/settings/materials`, `manager/dashboard`, `inventory/dashboard`,
  `inventory/stock`, `inventory/sales`, `inventory/customers`,
  `inventory/materials`). Fix: delete the inline `<div>` block, replace
  with `<PageHeader description="..." />` carrying the same description
  text, keep everything else on the page as-is. (`manager/settings/units`
  and `manager/settings/materials` are a double-fix: their page.tsx *and*
  their underlying feature component — `unit-conversion-manager.tsx` /
  `material-manager.tsx` — both currently set the same title
  independently; after this epic only the feature component's
  `usePageHeader` call should remain, carrying title + description
  together, and the page.tsx inline block goes away entirely.)
- **3 generic entity-wrapper `<h1>`s that have no business existing at
  all**, since the entity's own name is already shown in `TopBar` via the
  child Client Component's `usePageHeader()` override:
  `manager/products/[id]/page.tsx` (`<h1>Product</h1>` — note this lives
  in the page wrapper, not in `product-detail.tsx`/`ProductOverview`
  itself, which has no such heading today), `manager/customers/[id]/page.tsx`
  and `inventory/customers/[id]/page.tsx` (both `<h1>Customer</h1>`).
  **Decision: drop all three outright**, don't keep as a plain section
  label — nothing below them needs a generic "Product"/"Customer" label
  when the specific name is already one line above in `TopBar`, and
  `product-detail.tsx`'s own tab row provides the visual section break
  `CustomerProfile`/`ProductOverview` need.
- `product-stock-detail.tsx` and `material-detail.tsx` each have their own
  `<h1>{name} (...)</h1><p>Current balance: {x} kg</p>` block *inside* the
  Client Component, redundant with their own `usePageTitle(name)` call
  one line above it. Fix: fold into the `usePageHeader` call —
  `usePageHeader({ title: product.name, description: \`Current balance:
  ${balance} kg\` })` — and delete the inline block (keep the loading
  `Skeleton` fallback, just without the now-unnecessary heading
  skeleton rows if the description-carrying header makes them redundant;
  use judgment here, not a hard rule).

**Out of scope for this bullet:** `product-detail.tsx`'s two `<h2
className="text-sm font-medium">` sub-headings ("Price history", "Cost
history") are section labels *within* a tab's content, not page titles —
leave them alone, they don't match the `text-lg font-semibold` pattern and
aren't competing with `TopBar`.

## Out of scope

- The public landing page and sign-in page's own heading
  (`src/features/auth/components/landing-page.tsx`, `sign-in-form.tsx`) —
  neither is rendered behind `TopBar`/`AppShell` at all, different layout
  entirely.
- No visual redesign of `TopBar` itself beyond adding the description
  line — same font scale, same spacing conventions as the rest of the
  2026-11-08 sizing-bump round.
- `product-detail.tsx`'s hand-rolled button-row tab switcher (explicitly
  out of scope in Epic 17 too) — not touched here either.

## Open questions

None outstanding — the mobile-crowding concern above is a verify-before-
done check, not a design decision blocking the start of this epic.
