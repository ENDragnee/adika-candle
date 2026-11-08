# Decisions

A running log of non-obvious decisions on this project — what was decided,
why, and what else was considered. Newest entries first. This complements
(doesn't replace) git history and `AGENTS.md`: git log says *what* changed,
`AGENTS.md` is a snapshot of current state, this file is *why* for anything
future sessions/agents would otherwise have to re-derive from scratch.

Add an entry whenever you make a call that isn't obvious from reading the
code — especially ones a future session might second-guess or accidentally
undo.

---

## 2026-11-08 — Public landing page + navbar (outside the epic sequence)

**Built directly on request, after Epic 13** — reverses Epic 11's explicit
scope call ("no public marketing content... no new public routes for
unauthenticated visitors beyond `/auth/sign-in`") now that the user
specifically asked for a real landing page at `/` instead of `/` being a
pure redirect. Confirmed with the user first (two quick scope questions)
rather than guessing: kept it minimal — brand + one-line description +
"Sign in" CTA, no marketing sections/photography — and a shared navbar
with just brand + theme switcher + "Sign in" (no nav links, since there's
still only one public destination).

**`src/app/page.tsx` no longer unconditionally calls `RoleRedirector()`.**
It now calls `GetApiSession()` directly first: a signed-in session still
goes through `RoleRedirector()` exactly as before (dashboard by role, or
`/unauthorized`); a signed-out visitor now renders the new landing page
instead of being redirected to `/auth/sign-in`. `src/proxy.ts`'s
one-directional protected-route redirect (`/manager`, `/inventory`) and
`src/app/auth/layout.tsx`'s own already-signed-in redirect are both
unchanged — this only touches the one path that used to force every
visitor through sign-in.

**New `src/components/shell/public-navbar.tsx` + `theme-switcher.tsx`,
not a reuse/refactor of `AccountMenu`'s embedded theme section.**
`AccountMenu` bundles its `THEME_OPTIONS` list directly into its own
account dropdown (trigger is the user's avatar) — there's no signed-in
user on these pages to anchor that trigger to, so `ThemeSwitcher` is a
small standalone dropdown (icon-only trigger, same `THEME_OPTIONS` shape
duplicated rather than extracted, per the "three similar lines beats a
premature abstraction" rule — the two components' triggers are
structurally different enough that sharing would mean passing the
trigger markup through as a prop for a 5-line array). `ThemeSwitcher`'s
trigger icon reflects the resolved theme only after mount (`useEffect`
+ `mounted` guard) to avoid a server/client hydration mismatch, same
problem class `next-themes`' own docs call out.

**`PublicNavbar` takes a `showSignIn` prop (default `true`) rather than
sniffing the current route** — explicit prop over `usePathname()`
cleverness, matching this codebase's existing preference for explicit
props (`AccountMenu`'s `align`/`side`). `src/app/auth/layout.tsx` passes
`showSignIn={false}` so the sign-in page's navbar doesn't show a
redundant "Sign in" button while the whole page below it is the sign-in
form; the landing page keeps the default.

**New `src/features/auth/components/landing-page.tsx`** — plain
`LandingPage` component (brand heading, one-line description, "Sign in"
button), composed into `page.tsx` below the new navbar. `SignInPage`
(`src/app/auth/sign-in/page.tsx`) itself was left untouched — its
Card-based "Adika Candle" title + description (Epic 11) now reads as
slightly redundant with the navbar above it, but that's a minor,
separate polish call this request didn't ask for.

**Verified via Playwright**, signed out: `/` renders the landing page
(no redirect) with the navbar, theme switcher cycles light/dark/system
and persists across navigation to `/auth/sign-in` (navbar renders there
too, no duplicate "Sign in" button), and a 375px viewport. Signed in as
`manager`: `/` and `/auth/sign-in` both still redirect to
`/manager/dashboard` exactly as before — no regression to the existing
one-directional auth-gate behavior.

---

## 2026-11-08 — Epic 13 (Modal & Action-Menu UX) decisions

**Icon choice: `DotsThreeVerticalIcon` (Phosphor), `ghost` variant,
`icon-sm` size, `aria-label="Actions"`** — the vertical "kebab" reads as
a per-row menu trigger more conventionally than the horizontal
"meatballs" form; `icon-sm` matches the existing `Button` size scale
(same size `DialogContent`'s close button already uses). Dropdown items
got matching Phosphor icons (`PencilSimpleIcon` for Edit,
`CheckCircleIcon` for Activate, `ProhibitIcon` for Deactivate, the
latter two styled `text-destructive focus:text-destructive` on
Deactivate) — consistent with `AccountMenu`'s existing icon-per-item
convention, not a new pattern.

**`Dialog` (edit modal) and `AlertDialog` (deactivate confirm) are
nested as siblings-of-children around one `DropdownMenu`, all three
fully controlled by local `useState`, rather than wiring `DialogTrigger`/
`AlertDialogTrigger` to the dropdown items directly.** A `DropdownMenuItem`'s
`onSelect` only sets `isEditOpen`/`isConfirmOpen` state; `Dialog`/
`AlertDialog`'s `open` prop reacts to that state independently of
whatever the `DropdownMenu` is doing as it closes. This sidesteps any
Radix focus-handoff ordering between a closing menu and an opening
dialog — confirmed working with no focus-trap glitches in Playwright
(Edit modal opens prefilled immediately after the menu's Edit item is
clicked, repeatedly, light and dark). `ProductOverview`
(`product-detail.tsx`) uses the same nesting even though it has no
`DropdownMenu` — Edit/Activate/Deactivate are still plain buttons there
per the epic doc, so only `Dialog`+`AlertDialog` nest, both controlled
the same way.

**Each of the 4 composed tables keeps its create/edit forms as local,
unexported functions inside its own manager file (`CreateXForm`,
`EditXForm`), not factored into a shared `src/components/ui/` row-actions
component.** The four rows' data/mutation shapes differ enough
(category/unit-conversion have a dedicated `useDeactivateX` hook,
customer/user only have `useUpdateX({ isActive })`; user additionally
disables its whole action-menu trigger for the signed-in user's own row)
that a shared abstraction would mostly be parameter-passing, not reused
logic — continues Epic 9's precedent of keeping these 4 files'
row-components independent rather than forcing them through one
generic component.

**`UserRow` didn't have an `isEditing` toggle before this epic** (it
only had an always-visible `Select` for role, no dedicated Edit button) —
the epic doc's blanket "4 composed tables' per-row inline isEditing state
→ Edit modal" is read as applying to it anyway, since the inline `Select`
is the same "input swapped in place of display text" pattern the other
3 rows had. `UserRow` now shows `user.roleName` as plain text and gets
an Edit modal (disabled Name field + Role `Select`) from its action
menu, matching the other 3 rows' shape. `UpdateUserInputSchema` already
had no `name`/`email`/`username` fields (Epic 7's decision — see below),
so the Edit modal has nothing to edit beyond role; this isn't a new
restriction.

**`EditUnitConversionForm`/`EditUserForm` show the immutable field
(`unitName`/`name`) as a `disabled` `Input` rather than omitting it or
rendering it as plain text**, for layout consistency with the other
fields in the same modal — a minor presentational call, not a new
editability rule (`unitName` was never editable via `PATCH`; `name` had
no edit path either, per Epic 3's and Epic 7's decisions already on
file).

**`SetPriceForm`/`RepaymentForm`/`ManualAdjustmentForm` lost their own
`Card`/`CardHeader`/`CardTitle` wrapper** — each is now rendered inside
a `DialogContent` (which already supplies the panel chrome), and each
gained an `onSuccess: () => void` prop the composing page's `onOpenChange`
handler is passed as, called right after the mutation resolves so the
modal closes on success. All three are single-call-site components
(confirmed by grep before editing), so stripping the wrapper couldn't
orphan a second consumer that still wanted the old standalone-Card look.

**The "Price history" heading + "Set new price" button live in a new
`PriceHistoryTab` component inside `product-detail.tsx` itself, not
inside `price-history.tsx`.** `PriceHistory` (`price-history.tsx`) is a
bare `DataTable` wrapper with no heading of its own today; adding one
solely to host a modal trigger that only `product-detail.tsx` ever
composes next to it would mean threading a slot/children prop through a
component for a single call site. `product-detail.tsx` is the only file
that renders `SetPriceForm` and `PriceHistory` together, so the heading
row lives there.

**`CreateUserForm`'s temporary-password banner moved from inside the
(now-modal) create form to its own `Card` rendered unconditionally above
the table, next to the "Create user" button row** — per the epic doc's
explicit callout that this banner is "unaffected" and must keep
rendering above the table after the modal closes. It's sibling markup
to the modal trigger now, not nested inside the `Dialog`'s own content
(the modal itself closes on success, before the banner would even be
visible inside it).

**Files touched:** new `src/components/ui/alert-dialog.tsx`;
`src/features/categories/components/category-manager.tsx`,
`src/features/customers/components/customer-manager.tsx`,
`src/features/unit-conversions/components/unit-conversion-manager.tsx`,
`src/features/users/components/user-manager.tsx` (create/edit → modals,
row actions → `DropdownMenu`, deactivate → `AlertDialog`);
`src/features/products/components/product-detail.tsx` (`ProductOverview`
edit/deactivate → modal/`AlertDialog`; new `PriceHistoryTab` composing
`SetPriceForm`'s new modal trigger), `set-price-form.tsx`;
`src/features/customers/components/customer-ledger-view.tsx`,
`customer-profile.tsx`; `src/features/loans/components/repayment-form.tsx`,
`manual-adjustment-form.tsx`. Verified with `pnpm lint`, `pnpm test`,
`npx tsc --noEmit` (all clean — the Next.js TS language-service plugin's
"props must be serializable for components in the use client entry file"
hint on the new `onSuccess` props is editor-only noise, not a `tsc`
error; `Pagination`'s pre-existing `onPageChange` prop has the identical
shape and was never flagged either) and a Playwright spot-check signed
in as `manager`: Categories' full add → edit → deactivate → activate
cycle through the new modal/action-menu/`AlertDialog` flow, the product
detail page's Edit modal + "Set new price" modal (price actually applied
and reflected in the history table), the customer profile's "Record
repayment"/"Record adjustment" modals, and the Users page's Edit modal
(role `Select`) with the signed-in user's own row's action-menu trigger
confirmed disabled — light and dark mode, and a 375px mobile viewport
(bottom nav + horizontally-scrolled composed table + the dropdown menu
opening correctly over it), matching Epic 9/12's representative-spot-check
approach rather than an exhaustive route-by-route pass, per the epic
doc's own "out of scope" note.

---

## 2026-11-08 — Backend + frontend pagination decisions

**Every REST list endpoint got paginated, with two structural exceptions:
`GET /api/v1/roles` (already a different `{ roles, modules }` envelope
per Epic 7, and the role count is permanently 2 — nothing to paginate)
and `manager-dashboard.tsx`'s three GraphQL-sourced inline tables
(low-stock alerts, stock levels, loan exposure — a different mechanism,
the single-query `dashboard` resolver in `src/app/api/graphql/route.ts`,
not a REST list route).** Confirmed with the user: paginate everything
else uniformly rather than scoping to just the append-only transaction
logs — 11 routes total (products, categories, customers,
unit-conversions, users, sales, stock balances, stock ledger, loan
oversight, loan transactions, price history).

**New shared `src/lib/pagination.ts`**: `PaginationQuerySchema` (Zod,
`page`/`pageSize` with defaults 1/20, `pageSize` capped at
`MAX_PAGE_SIZE` = 100), `ToSkipTake`/`BuildPaginationMeta` helpers for
route handlers, `PaginatedResponseSchema(itemSchema)` for
`responseSchema`, and `Paginated<T>`/`PaginationParams` types reused
directly by every feature's frontend `service.ts` (no per-feature
duplicate schema/type). Every paginated route follows one pattern:
`Promise.all([model.findMany({ ...where, ...ToSkipTake(query) }),
model.count({ where })])`, returning `{ data, pagination }`.

**Several hooks are called two different ways — "a page to browse" vs.
"everything, for a `<Select>` dropdown" — and this wasn't obvious until
implementation surfaced it.** `useProducts`, `useCategories`,
`useUnitConversions`, and `useCustomers` are each consumed by both a
browsable list page (default `pageSize` 20, renders `<Pagination>`) and
one or more dropdown pickers (`create-product-form.tsx`,
`product-detail.tsx`'s edit form, `accept-stock-form.tsx`,
`record-sale-form.tsx`) that need the *complete* active list to populate
a `<Select>`, not just page 1. Rather than adding a second non-paginated
fetch path per resource, dropdown call sites simply pass
`{ pageSize: MAX_PAGE_SIZE }` to the same paginated hook/endpoint — this
app is a single small factory, so a 100-row ceiling is already generous
for categories/units/products/customers. **Known limit, not silently
hidden:** if any of those four ever exceeds 100 active rows, a dropdown
would silently truncate rather than erroring — flagged here rather than
building a second endpoint for a scale this app isn't at.

**`product-stock-detail.tsx` (shows one product's current balance) used
to call `useStockBalances()` with no args — fetching every product's
balance just to `.find()` one row.** Fixed opportunistically while
touching this hook's signature anyway: it now calls
`useStockBalances({ productId })`, using `StockBalanceQuerySchema`'s
existing (pre-pagination) `productId` filter that nothing had wired up
to this call site before. Not a pagination-caused regression — a
pre-existing inefficiency this work happened to touch.

**`customer-list.tsx`'s name search moved from client-side
`.filter()` to a server-side `search` param
(`CustomerQuerySchema.search`, `Prisma`'s `contains`/`insensitive`)** —
required, not optional, once results are paginated: client-side
filtering only ever sees the current page's 20 rows, so a customer on
page 2 would become unfindable by search. Debounced 400ms via the
existing (previously unused but already tested) `src/lib/use-debounce.ts`.
Page resets to 1 directly inside the search input's `onChange` handler
rather than via a `useEffect` keyed on the debounced value — simpler,
avoids a step of indirection, and side-steps a biome
`useExhaustiveDependencies` complaint about a dependency that's only
ever used to *trigger* the effect, never read inside it.

**`Pagination` (`src/components/ui/pagination.tsx`) is hand-built
against the existing `Button`/`cn` primitives, not pulled from the
shadcn registry** — confirmed with the user, consistent with every
other `src/components/ui/` primitive in this app (`avatar.tsx`,
`dropdown-menu.tsx`, etc., all hand-authored against `radix-ui`
directly). A CLI-pulled component would need the same manual
`rounded-none` → radius-scale fix Epic 9 already did for every other
primitive, so there's no real time saved. Previous/Page X of
Y/Next only — no numbered page buttons, confirmed with the user over a
more typical numbered-pagination control, since this app's data volumes
don't call for jumping to an arbitrary page.

**`DataTable<T>`'s mobile card view and `Pagination` compose for free** —
`DataTable` renders one `<Pagination>` beneath whichever of its two
responsive trees (desktop table / mobile card list) is visible, so none
of the 8 `DataTable<T>`-consuming components had to think about mobile
placement themselves. The 3 composed-row managers that gained
pagination (`category-manager.tsx`, `customer-manager.tsx`,
`unit-conversion-manager.tsx`, `user-manager.tsx` — 4 total, all
pre-existing `TableSkeleton mobileCard={false}` consumers from the
mobile-shell work above) render `<Pagination>` manually beneath their
`TableContainer`, same pattern.

**Verified against the real dev database, not just unit tests** —
seeded 25 extra categories and 21 extra products via direct API calls
(`page.request` in Playwright, reusing the signed-in session) to force
a real second page, confirmed Previous/Next/page-count on both a
composed table (Categories) and a `DataTable<T>` list (Products, desktop
and mobile card view), confirmed a dropdown picker still listed all 26
categories post-pagination, confirmed `customer-list.tsx`'s search still
finds a customer not on the currently-loaded page, then hard-deleted the
seeded rows directly via Prisma (`category.deleteMany`/
`product.deleteMany` — the REST API only soft-deactivates, which would
have left 25+ "Inactive" rows cluttering the dev data).

---

## 2026-11-08 — Mobile-responsive shell decisions

**Breakpoint is `md` (768px), independent of the stat-tile grid's existing
`sm` (640px) step.** Below `md`: sidebar hidden, a `MobileHeader` +
`BottomNav` (`src/components/shell/`) replace it. At `md`+: the original
sidebar layout, unchanged except for the new account section at its
bottom. Chosen over `sm` because the sidebar nav itself (up to 10 items
for Manager) needs real width to read as a sidebar, not just "not a
phone."

**Bottom bar: all nav items scroll horizontally in one strip; the account
avatar is a separate, non-scrolling tab pinned at the end** (confirmed
with the user over the alternative — a fixed ~4 items + a "More"
sheet/drawer). Chosen because no Sheet/Drawer primitive exists in this
project yet, and because Manager's 10 items vs. Inventory Manager's 6
would need two different "which 4 items win" decisions. The avatar tab
never scrolls away, mirroring YouTube's always-visible profile tab.
`BottomNav` (`src/components/shell/bottom-nav.tsx`) reuses the exact same
active-route logic the old sidebar used
(`pathname === href || pathname.startsWith(href + "/")`).

**New `account-menu.tsx` renders its trigger via a `children` prop
instead of owning its own `Avatar` markup**, so the same `AccountMenu` +
`DropdownMenu` logic can be reused for two visually different triggers:
a full-width name/role row at the sidebar's bottom (desktop) and a small
icon-and-label tab in the bottom bar (mobile) — one`GetInitials()` helper
(also exported from that file) builds the fallback initials for both.
Sign-out is inlined in the dropdown item's `onSelect` rather than nesting
the existing `<SignOutButton>` — a `<button>` can't validly nest inside a
Radix `DropdownMenuItem` (itself `role=menuitem`). `SignOutButton` itself
is untouched, still used standalone on `src/app/unauthorized/page.tsx`.

**The old header (`"{name} · {role}"` + Sign out button) was removed
entirely on desktop, not kept alongside the new sidebar account section**
— that was its only content, so leaving an empty header bar behind would
be dead chrome. `MobileHeader` (just the "Adika Candle" wordmark) is the
only header now, and only renders below `md`.

**`DataTable<T>` (`src/components/ui/data-table.tsx`) gained a real
stacked-card view below `md`, built from the existing
`DataTableColumn<T>[]` structure — the first column's `cell(row)` becomes
each card's `CardTitle`, the rest render as a `dl` of label/value rows
styled like `DetailSkeleton`/`ProductOverview`'s existing convention
(`flex justify-between border-b border-border pb-2 last:border-b-0`).**
This required zero changes to any of the 9 call sites
(`product-list.tsx`, `sale-list.tsx`, `stock-ledger.tsx`, etc., plus
`manager-dashboard.tsx`'s three inline tables) — the column metadata
they already pass was sufficient. The 4 composed-row files
(`category-manager.tsx`, `customer-manager.tsx`,
`unit-conversion-manager.tsx`, `user-manager.tsx`) were **not** given
this treatment — their rows are stateful components with inline
edit/mutation logic, and rebuilding that as mobile cards is a separate,
larger job. They (and every other table) get `overflow-x-auto` on
`TableContainer` as a baseline instead, so nothing is ever unusable on a
narrow screen, just horizontally scrollable.

**`TableSkeleton` gained a `mobileCard` prop (default `true`), and the 4
composed-row files now pass `mobileCard={false}` explicitly** — a small,
deliberate deviation from "zero call-site changes," made after
confirming `TableSkeleton` is shared by both groups (the 9 `DataTable<T>`
consumers *and* the 4 composed files call it directly). Without the
prop, the composed files' loading state would show a card-shaped
skeleton on mobile while their real loaded content stays a table — the
exact shape-mismatch/layout-jump Epic 10's `DetailSkeleton`/
`TableSkeleton` work was built to avoid. 4 one-line call-site edits was
judged worth it over either skipping the mobile skeleton correctness or
expanding scope to rebuild those 4 tables as cards too.

**Dashboard stat tiles (`manager-dashboard.tsx`) go 2-column below `sm`,
not every `Card` in the app** — confirmed with the user: applying a
blanket 2-column grid to full-width forms or `RoleCard`'s permission
checkboxes would cramp them on a ~375px phone. Only the 3 short,
number-led `StatTile`s (loaded state *and* its matching `CardSkeleton`
loading grid, kept in sync per Epic 10's shape-matching convention) were
in scope.

**Root-caused a page-level horizontal-scroll bug to a classic Flexbox
`min-width: auto` trap, not the tables themselves.** `TableContainer`
already had `overflow-x-auto`, but on a composed-table page (e.g.
`/manager/categories`) the whole page still scrolled sideways on mobile.
The actual cause: `app-shell.tsx`'s `<div className="flex flex-1
flex-col">` (and `<main>` inside it) are flex items in the outer row
flex (`<div className="flex min-h-screen">`) with no `min-w-0` — by
default a flex item won't shrink below its content's intrinsic width,
so a wide table inside `main` forced the whole shell wider than the
viewport instead of scrolling internally. Fixed by adding `min-w-0` to
both the wrapper div and `main`. Also surfaced (and fixed, same root
cause) that the 4 composed-table create-forms' `min-w-48`/`min-w-40`
flex-wrap field widths (e.g. `category-manager.tsx`'s Name/Description
fields) don't leave room to wrap on a narrow phone — changed to
`min-w-full sm:min-w-48`/`sm:min-w-40` so fields stack full-width below
`sm` and keep their original side-by-side sizing at `sm`+.

**New `src/components/ui/avatar.tsx` and `dropdown-menu.tsx`** wrap
Radix `Avatar`/`DropdownMenu` from the `radix-ui` package (already a
dependency, already used this way for `Select`/`Dialog`/`Label`/
`Separator`). `DropdownMenuContent`/`DropdownMenuItem` reuse
`SelectContent`/`SelectItem`'s exact floating-panel styling
(`rounded-lg bg-popover ring-1 ring-foreground/10 shadow-md`, same
`data-open:animate-in...` transitions) rather than inventing a new look.

---

## 2026-11-08 — Epic 12 (Page-by-Page Polish) decisions

**Resolved the task brief's "the same 13 files above" (for the Card
conversion list) as the 7 standalone forms from its own input-swap list
plus the 6 named manager/chart files — 13 total, not a separate,
unstated set.** The brief's wording was internally inconsistent (its own
item 1 lists 7 forms, not 13), but 7 + 6 = 13 lines up exactly with the
count named in item 3, so this is almost certainly what was meant rather
than a reference to Epic 9's unrelated "13 table files." Treated "Card
treatment" as: wrap each file's plain `rounded-xl border border-border
p-3` (or, for `repayment-form.tsx`/`manual-adjustment-form.tsx`,
`border border-border p-3`) content box in `Card`/`CardContent`
(`CardHeader`+`CardTitle` where there was a heading to promote).

**`product-detail.tsx` got the `<input>`/`<select>` → `Input`/`Select`
swap (per item 1) but deliberately did *not* get Card-wrapped**, unlike
the other 12 files above. `ProductOverview`'s read-only `dl` and its edit
form share a loading placeholder, `DetailSkeleton`
(`src/components/ui/skeleton.tsx`), which Epic 10 explicitly built to
match "the unwrapped `dl` shape" — wrapping the real content in `Card`
would reintroduce the layout jump Epic 10 was built to eliminate, without
also inventing a new Card-shaped skeleton variant that nothing in this
epic's scope asked for. `CustomerHeader`
(`src/features/customers/components/customer-header.tsx`) uses the same
`DetailSkeleton` and was left untouched for the same reason — it wasn't
in Epic 12's own file list anyway.

**`role-manager.tsx`'s `RoleCardSkeleton` was updated in lockstep with
`RoleCard`'s Card conversion**, even though only `RoleCard` was named in
the file list. Epic 10's decision log ties `RoleCardSkeleton`'s shape
explicitly to `RoleCard`'s real markup ("matches RoleCard's title +
module/checkbox-group + save-button shape") — leaving the skeleton on
the old `border border-border p-3` div while the real card moved to
`Card` would have broken that invariant and reintroduced a loading→loaded
layout jump. The skeleton now wraps the same `Skeleton` blocks in
`Card`/`CardHeader`/`CardContent` instead of hand-rolling the border.

**`sales-trend-chart.tsx`'s one "plain bordered box" — the hover
tooltip — was converted to Epic 9's floating-panel convention
(`rounded-lg bg-popover ring-1 ring-foreground/10 shadow-md`, matching
`select-content`/dialog content), not wrapped in `Card`.** The chart
itself has no bordered container at the top level (that's
`manager-dashboard.tsx`'s plain `Section` wrapper, out of this epic's
file list and shared by several non-Card dashboard sections, so changing
it wasn't in scope); the tooltip was the only hard-edged element in the
file, and it's a transient floating element like Select/Dialog content,
not a persistent content block, so the floating-panel treatment fit
better than `Card`.

**Phosphor `PlusIcon` was added only to true "create a new X" front
doors, not every submit button** — per the task's own "don't over-apply"
instruction: the `/manager/products` "New product" link, `CreateProductForm`'s
"Create product" submit, and each manager's "Add category"/"Add
customer"/"Add unit"/"Create user" submit (`category-manager.tsx`,
`customer-manager.tsx`, `unit-conversion-manager.tsx`,
`user-manager.tsx`). Deliberately skipped on `SetPriceForm` ("Set new
price"), `AcceptStockForm`/`RecordSaleForm` ("Accept stock"/"Record
sale"), `RepaymentForm`/`ManualAdjustmentForm` ("Record"/"Apply
adjustment"), and `ProductOverview`'s "Save" — these read as
transactional/edit actions, not "New X" entity-creation fronts, even
though some of them do create a row under the hood.

**Split the "New product" link into a new Client Component,
`src/features/products/components/new-product-link.tsx`, instead of
importing `PlusIcon` directly into `src/app/(dashboard)/manager/products/page.tsx`.**
That page is a Server Component (`async function`, no `"use client"`,
calls `CheckPermission`) — importing `@phosphor-icons/react` there
reproduces exactly the `createContext only works in Client Components`
crash Epic 9 documented for `nav-config.ts`. Every other `PlusIcon` use
this epic added lives in a file that was already `"use client"`, so this
was the only call site that needed the split. **Convention going
forward:** before adding a Phosphor icon to any button/link on a page or
layout file, check whether that file has `"use client"` — if not, put the
icon-bearing element in its own small Client Component instead of
importing the icon into the Server Component file directly.

**Labels on the 7 standalone forms stayed plain `<label>` elements, not
the `Label` component** (`@/components/ui/label`) that Epic 11 paired
with `Input` on `sign-in-form.tsx`. The task's own item 1 says this swap
should follow "the same pattern Epic 9 used for the 13 table files" —
and Epic 9's own 13 files (e.g. `category-manager.tsx`,
`customer-manager.tsx`) kept plain `<label>` throughout; the `Label`
component swap on `sign-in-form.tsx` was a separate, additional choice
Epic 11 made for that one page, not a precedent this epic was asked to
extend.

**Files touched:** `create-product-form.tsx`, `set-price-form.tsx`,
`product-detail.tsx`, `accept-stock-form.tsx`, `record-sale-form.tsx`,
`repayment-form.tsx`, `manual-adjustment-form.tsx` (input/select swap +
Card, except `product-detail.tsx` — swap only); `category-manager.tsx`,
`customer-manager.tsx`, `unit-conversion-manager.tsx`, `user-manager.tsx`,
`role-manager.tsx` (+ its skeleton), `sales-trend-chart.tsx` (Card /
floating-panel treatment); `src/app/(dashboard)/manager/products/page.tsx`
(new "New product" icon, delegated to a new file); new file
`src/features/products/components/new-product-link.tsx`. Verified with
`pnpm lint`, `pnpm test`, `npx tsc --noEmit`, and a Playwright spot-check
(products list/create, categories, customers + detail, units, users,
roles, product detail's both tabs and edit mode, inventory's accept-stock
and record-sale forms, the dashboard tooltip) in both light and dark mode
plus a 320px-wide check on the customer ledger page — matching Epic 9's
representative-spot-check approach rather than an exhaustive route pass,
per the epic doc's own "out of scope" note.

---

## 2026-11-08 — Epic 11 (Landing / Sign-in Page) decisions

**The "what Adika Candle is" line lives inside the `Card` (as `CardHeader` →
`CardTitle` + `CardDescription`), not in `AuthLayout` or as separate markup
on `SignInPage`.** `AuthLayout` only centers `{children}` and runs the
session check — the epic doc is explicit this stays untouched, and it has
no business owning page copy since future auth screens (if any were ever
added) might not want the same line. `SignInPage` previously hand-rolled
its own `<h1>`/`<p>` above `<SignInForm />`; replaced with one `Card`
(`w-full max-w-sm`, matching the old wrapper's width) containing
`CardHeader` (title + description) and `CardContent` (the form) — this is
the first real usage of `CardHeader`/`CardTitle`/`CardDescription`/
`CardContent` together anywhere in the app (Epic 8's `manager-dashboard.tsx`
only ever used bare `Card`+`CardContent`). `CardTitle` is given a layout-only
className override (`text-2xl font-semibold tracking-tight`, replacing its
default `text-sm font-medium`) rather than a general component change,
since every other `CardTitle` use case to date is content-dense (stat
tiles), not a welcome screen.

**Copy: "Adika Candle" / "Sales, stock, and loan management for the candle
factory."** — a shortened, sentence-cased rephrasing of the epic doc's own
parenthetical ("candle factory sales/stock/loan management") and
`src/app/layout.tsx`'s metadata description ("Sales, production, and
inventory management for Adika Candle"), not copied verbatim from either.
Dropped "production" (nothing in the built app manages production) and
reordered to lead with the product name as a plain heading — no eyebrow
label, no tagline-style accent word, per `frontend-design`'s restraint
guidance.

**`sign-in-form.tsx`'s two `<input>`s became `Input` (`@/components/ui/input`)
and its `<label>`s became `Label` (`@/components/ui/label`, Radix-backed,
already used elsewhere but never previously paired with `Input` on this
form).** This is the same `rounded-none` → design-system swap Epic 9 did
for the 13 table files' inputs, explicitly deferred for this form at the
time (see Epic 9's decision entry below) and explicitly reclaimed by this
epic's own scope doc. The form's outer `<form>` lost its own `max-w-sm`
(now just `w-full`) since it's nested inside the Card's already-`max-w-sm`
container — keeping both was redundant, not a conflict.

**Verified via Playwright**, not just `tsc`/`vitest`: loaded `/auth/sign-in`
after clearing the session (the in-app "Sign out" button — direct cookie
deletion via `page.evaluate` didn't work since the session cookie is
`httpOnly`), confirmed light and dark mode (`localStorage.theme` + reload,
not just toggling the `dark` class directly — `next-themes` needs the
reload to apply it consistently), signed in end-to-end as
`manager`/`ChangeMe123!` (note: the seeded **username** is `manager`, not
`manager@adika.local` — confirmed against `prisma/seed.ts`) and confirmed
the redirect to `/manager/dashboard`, and checked a 320px-wide viewport for
overflow. No code changes resulted from this pass; the design worked on
the first implementation.

---

## 2026-11-08 — Epic 10 (Loading States / Skeletons) decisions

**`TableSkeleton` takes a plain `columns: number`, not a `DataTableColumn<T>[]`
array or real header text.** Considered reusing the same `columns` array
already passed to `DataTable<T>` so the skeleton's header row could show
real (static) header text instead of shimmering blocks — header labels
don't come from the loading data, so there'd be no flash-of-wrong-content
risk. Rejected because the 4 composed-table files (`category-manager.tsx`,
`customer-manager.tsx`, `unit-conversion-manager.tsx`, `user-manager.tsx`,
see Epic 9's decision below) hand-write their `TableHead` cells directly
and have no `DataTableColumn[]` array to pass — supporting both shapes
would mean either two props or a union type for one cosmetic win. Plain
`columns: number` works identically for both groups: the 9 `DataTable<T>`
call sites pass `columns.length` from their existing array (one extra
token, no new plumbing), the 4 composed files pass a literal matching
their hand-written `TableHead` count. Lives in `data-table.tsx` next to
`DataTable`/`TableContainer` since it's genuinely shared, not
feature-specific.

**Default row count is a flat `5` (`DEFAULT_SKELETON_ROWS` in
`data-table.tsx`), not tuned per call site.** The epic doc only requires
matching *column* count exactly (so there's no layout jump from the real
table's width); row count has no equivalent correctness requirement since
a real result set's length is unknowable before it arrives. Picked one
default over guessing a "typical" count per table (e.g. fewer rows for
`LowStockAlerts`, more for `ProductList`) — that's speculative precision
the epic didn't ask for and would need revisiting every time seed data
changes. `manager-dashboard.tsx`'s three tables and all `DataTable<T>`/
composed-table call sites use the default; only `customer-ledger-view.tsx`/
`customer-profile.tsx`'s embedded ledger skeleton passes `rows={5}` too,
so this is effectively uniform across the app.

**`SalesTrendChartSkeleton` lives in `sales-trend-chart.tsx` itself, not in
`src/components/ui/`.** Unlike `TableSkeleton`/`CardSkeleton`/
`DetailSkeleton` (generic, reused across many unrelated features), this
skeleton's bar-grid shape is specific to one chart in one feature — matches
`AGENTS.md`'s "feature-specific components live in the feature folder"
convention. Its 30 bars use deterministic heights (`30 + ((index * 17) %
60)`), not `Math.random()` — purely decorative, so determinism costs
nothing and avoids any doubt about hydration-timing flakiness.

**`customer-ledger-view.tsx`/`customer-profile.tsx`'s "Loading loan
account…" guard (blocking `RepaymentForm`/`ManualAdjustmentForm` +
`LoanLedger` until `useCustomer` resolves) was not given a new dedicated
skeleton variant.** Its real content is a composite — one or two forms
plus a ledger table — that doesn't match any of the epic's four named
shapes. Rather than inventing a fifth variant for two call sites, composed
a plain `Skeleton` block sized to approximate each form's height
(`h-56`/`h-64 w-full max-w-sm`) alongside a `TableSkeleton columns={5}` for
the ledger (which `LoanLedger` itself already skeletons once mounted with
a real `accountId`) — reuses only the existing primitives. Same reasoning
for `RoleManager`'s loading state: `RoleCard`'s title + module/checkbox-group
+ save-button shape doesn't match the four named variants either, so
`RoleCardSkeleton` is a local, unexported composition inside
`role-manager.tsx` built from plain `Skeleton` blocks, not a new
`components/ui` primitive. It renders exactly 2 cards — the app only ever
seeds two roles (Manager, Inventory Manager; see "RBAC modeled as data"
below) — rather than a parameterized count.

**Verified visually by adding a temporary 8-second delay to
`axiosInstance`'s request interceptor in `src/lib/axios.ts`** (every
request, since every feature service routes through this one instance,
REST and the GraphQL dashboard query alike), reverted immediately after
confirming each skeleton via Playwright screenshots in both light and dark
mode. 2 seconds wasn't enough to reliably catch mid-flight — the gap
between issuing a browser-automation navigate call and the following
screenshot call was itself several seconds, so a short delay would
sometimes already be resolved by the time the screenshot fired. Not
committed; `git status` on `src/lib/axios.ts` is clean.

---

## 2026-11-08 — Epic 9 (Design System Foundation) decisions

**The "techy-edged" look traced to two root causes, not thirteen files of
hand-rolled styling: a global `font-mono` and the shadcn registry's own
zero-radius style.** `globals.css` already had a complete, unused shadcn
token set (`--radius`, `--card`, `--popover`, full dark-mode palette) from
the original scaffold — nothing wrong with the tokens themselves. Two
things overrode them everywhere: (1) `src/app/layout.tsx` applied a
literal `"font-mono"` Tailwind utility class directly on `<html>` in its
`cn()` call, which — because Tailwind's utility layer always wins over
`@layer base` — silently defeated `globals.css`'s `html { @apply
font-mono; }` even after that line was changed to `font-sans`; the fix
had to touch both files. (2) The project's shadcn `components.json` is
configured with `"style": "radix-lyra"`, a zero-border-radius registry
style — every primitive (`button.tsx`, `card.tsx`, `input.tsx`, etc.)
ships `rounded-none` baked into its own class string, so pulling in new
primitives for this epic reproduced the sharp-edged look by default.
Fixed by hand-editing each new primitive's `rounded-none` to a step on
the existing `--radius` scale (`rounded-md` for controls — Button,
Badge, Input, Select trigger/item; `rounded-lg` for floating panels —
Dialog content, Select content; `rounded-xl` for `Card`) rather than
switching registry styles, since nothing else about `radix-lyra` (density,
ring-based elevation instead of box-shadow) was a problem — only its
radius default was.

**Accent color: one warm honey-amber hue (`oklch(0.58 0.15 68)` light /
`oklch(0.78 0.15 72)` dark), applied only to `--primary`/`--ring`/
`--sidebar-primary`/`--sidebar-ring`.** Deliberately not the generic
"AI-generated design" terracotta tell (`~oklch(0.65 0.14 35)`, hue ~35°)
flagged in the `frontend-design` skill — picked a hue ~68-72° (yellow-leaning
amber/honey, evoking candle wax) instead, clearly separated in hue angle.
Every other token (`--background`, `--border`, `--muted`, `--accent`,
Epic 8's `--chart-*`) stays achromatic — one accent, not accent-everywhere,
per the "spend your boldness in one place" principle. Incidentally fixed
a pre-existing bug: dark mode's `--sidebar-primary` was
`oklch(0.488 0.243 264.376)` (a blue, leftover shadcn default) even
though nothing used it — `AppShell`'s active-nav state read
`--sidebar-accent` instead. Epic 9 wires the active-nav pill to
`--sidebar-primary` for the first time, which is what surfaced the stale
blue value; replaced with the new amber.

**One shared `DataTable<T>` (`src/components/ui/data-table.tsx`)
component, but not for all 13 files that had a hand-rolled `<table>`.**
Split into two groups by whether each row is already its own stateful
component: `product-list.tsx`, `price-history.tsx`, `stock-ledger.tsx`,
`stock-balance-list.tsx`, `sale-list.tsx`, `loan-ledger.tsx`,
`loan-oversight-list.tsx`, `customer-list.tsx`, and
`manager-dashboard.tsx`'s three tables (9 total) have no per-row
local state — they adopt the generic `columns`+`data`+`cell`
`DataTable<T>`. `category-manager.tsx`, `customer-manager.tsx`,
`unit-conversion-manager.tsx`, `user-manager.tsx` (4 total) have
per-row components with local `isEditing` state or per-row mutations
(`CategoryRow`, `CustomerRow`, `UnitConversionRow`, `UserRow`) — forcing
these through a column/cell abstraction would mean splitting one row's
`useUpdateX()` mutation hook across multiple cell sub-components, so
they keep their existing row-component pattern but render shadcn's
`Table`/`TableRow`/`TableCell` instead of raw `<table>`/`<tr>`/`<td>`,
wrapped in the same `TableContainer` (also exported from
`data-table.tsx`) for identical chrome. Both groups render visually
identically; only the internal composition differs, by necessity not
preference.

**While already editing those 13 files for the table swap, their
`inputClassName`-styled `<input>`/`<select>` elements were also swapped
to the new `Input`/`Select` components** — both the edit-row inputs
(inside the table being touched anyway) and each file's "create new X"
form above the table. Scoped this way deliberately: leaving a file with
a newly-rounded table sitting under a still-`rounded-none` create-form
would look half-migrated within one file, which is worse than a slightly
larger diff. Standalone forms with no accompanying table in the same file
(`accept-stock-form.tsx`, `record-sale-form.tsx`, `create-product-form.tsx`,
`set-price-form.tsx`, `manual-adjustment-form.tsx`, `repayment-form.tsx`,
`sign-in-form.tsx`, `product-detail.tsx`'s edit form) were **not** touched
— correctly deferred to Epic 12, which doesn't need an opportunistic
justification to open them.

**Phosphor icon components required `"use client"` on `nav-config.ts`,
a plain data file.** `MANAGER_NAV_ITEMS`/`INVENTORY_NAV_ITEMS` hold
references to `@phosphor-icons/react` icon components (not rendered
JSX, just the component function as data) and are imported by
`src/app/(dashboard)/layout.tsx`, a Server Component. Phosphor's icons
use a shared `IconContext` internally, and merely importing (not
rendering) one into a module reachable from a Server Component without
`"use client"` throws `createContext only works in Client Components` at
module-evaluation time — not a rendering-time error, so it surfaced as a
500 on every page under `(dashboard)/layout.tsx` until `"use client"`
was added to `nav-config.ts` itself (the actual rendering already
happened inside `AppShell`, already a Client Component — the failure was
purely from the data file being imported into the server module graph
first). Also note: this project's installed `@phosphor-icons/react`
(`2.1.10`) exports two names per icon — e.g. both `Gauge` and
`GaugeIcon` — and the `Icon` type itself is only re-exported from the
`@phosphor-icons/react/lib` subpath, not the package root.

---

## 2026-11-08 — Epic 8 (Analytics / Dashboards) decisions

**Low-stock alerts got a real schema field (`Product.lowStockThresholdKg`,
nullable `Decimal`), not a hardcoded global number.** The epic doc
explicitly left this open (no threshold field existed anywhere in the
schema). Chose "add a field" over "just list the lowest-N products" because
a hardcoded threshold (e.g. "< 10kg") would be meaningless across products
with very different normal stock levels (a candle SKU that normally holds
2kg vs. one that holds 200kg), and the epic's own Manager-editable framing
fit the existing per-product edit pattern on `/manager/products/[id]`
(`ProductOverview` in `product-detail.tsx`) better than a new settings
page. Nullable and opt-in per product — a product with no threshold set
never raises an alert, there is no implicit default. `GET dashboard`'s
`lowStockAlerts` resolver additionally filters to `isActive` products
(an inactive/discontinued product's stock level isn't actionable), while
`stockLevels` itself stays unfiltered to match `GET /api/v1/stock`'s
existing behavior.

**Sales trend is daily totals, last 30 days (today inclusive), including
zero-sale days.** Bucketed in JS after one `prisma.sale.findMany` (not a
raw-SQL `GROUP BY date_trunc`) — this app's sale volume doesn't need
database-side aggregation, and keeping it Prisma-only avoids a
Postgres-specific raw query. Zero-sale days are filled in explicitly
(not omitted) so the trend chart has a continuous 30-point x-axis rather
than gaps that could be misread as missing data. Grouping is per
`Sale.totalAmount` directly, consistent with the "Sale is
single-product-per-transaction" decision — no `SaleLine` aggregation
needed.

**No charting dependency was added.** `SalesTrendChart`
(`src/features/analytics/components/sales-trend-chart.tsx`) is a
hand-built CSS grid bar chart (not SVG — a `viewBox`-scaled SVG distorts
rounded-corner radii non-uniformly when width and height scale
differently, which a plain grid of flex/grid `div`s avoids entirely).
Colored with the app's existing `--chart-*`/`--foreground` tokens from
`globals.css` (already theme-aware light/dark) rather than introducing a
new palette — single series, so per the `dataviz` skill's "a single
series needs no legend box" rule, there's no legend. Picked over
`recharts`/`visx`/etc. because `package.json` had no charting library and
one chart didn't justify adding a dependency.

**`GET dashboard`'s `totalLoanExposure` sums only positive
`LoanAccount.balance` rows, not every account netted together.** Per the
`LoanAccount.balance` sign convention (positive = customer owes the
business, negative = business owes the customer), a negative balance
isn't risk exposure — netting it against positive balances would
understate what the business is actually owed. `loanAccounts` (the full
list backing the oversight table) is unfiltered and still sorted by
balance descending, matching `GET /api/v1/loans`.

**The Inventory dashboard (`/inventory/dashboard`) stayed pure REST,
reusing `SaleList`/`StockBalanceList` directly** — no new component, no
GraphQL query. Confirmed during implementation that the epic doc's own
suggestion held: `useSales({ createdById: session.user.id })` and
`useStockBalances()` were already exactly what the page needed, the same
pattern `/inventory/sales` already uses for "own recent sales." The
GraphQL `dashboard` query (`src/app/api/graphql/route.ts`) is Manager-only
(`analytics:read`), combining sales trend + stock levels + loan exposure +
low-stock alerts in one round trip, per the REST/GraphQL split decision
below.

---

## 2026-11-08 — Epic 7 (Users + RBAC Management UI) decisions

**`User.isActive` was added (not in the original schema) and deactivation
is enforced entirely inside `customSession`, not in the auth flow itself.**
The epic doc's `/manager/users` page table says "deactivate" but
`prisma/schema.prisma`'s `User` model had no active/inactive flag —
better-auth's own sign-in has no concept of it either. Added
`isActive Boolean @default(true)` (matching Product/Category/Customer's
convention) and made `customSession` (`src/lib/auth.ts`) return
`role: null, permissions: []` whenever `dbUser.isActive` is false. A
deactivated user can still complete sign-in (better-auth issues a valid
session), but every `CheckPermission`/`CheckAnyPermission` call and the
`ManagerLayout`/`InventoryLayout`/`RoleRedirector` role gates reject them
on their very next request — no change to the auth flow itself, no
session-revocation logic needed.

**`POST /api/v1/users` generates a random temporary password server-side
and returns it once in the response, rather than taking a password field
on the create form or defaulting to a hardcoded string.** The epic doc
says nothing about where an admin-created user's initial password comes
from; `prisma/seed.ts`'s dev users use a hardcoded `"ChangeMe123!"`, which
is fine for seed data but wrong for real accounts (reused/guessable,
and an admin shouldn't be choosing — or seeing — another person's
password). `GenerateTemporaryPassword()`
(`src/features/users/services/generate-temporary-password.service.ts`)
produces a 16-char random string using `node:crypto`'s `randomInt`;
`POST /api/v1/users` calls the same `auth.api.signUpEmail` shape as
`ensureDevUser` with it, then returns `{ user, temporaryPassword }` —
`CreateUserResponseSchema`, not `UserSchema` — so the plaintext only ever
exists in that one response. It's never stored, logged, or returned again
from `GET`/`PATCH`; the UI shows it once in a dismissible banner.

**Two self-lockout guards were added, scoped narrowly rather than
blocking all self-edits.** Nothing in the epic doc addresses the risk that
a Manager could deactivate their own account or strip `role:manage`/
`user:manage` off the Manager role, leaving nobody able to fix it short of
editing the DB directly. Decided this was worth guarding rather than
accepting as risk, given the fix is cheap and the failure mode is a full
lockout:
1. `PATCH /api/v1/users/[id]` rejects `isActive: false` or any `roleId`
   change when `params.id === session.id` — a Manager can't deactivate or
   reassign their own account, full stop (not just "if it would remove
   the last admin" — simpler to reason about and the only self-edit this
   page exposes anyway).
2. `PATCH /api/v1/roles/[id]/permissions` rejects removing `role:manage`
   or `user:manage` from a role if no *other* role would still hold it
   (`GUARDED_PERMISSION_NAMES` in `src/app/api/v1/roles/[id]/permissions/route.ts`).
   This guards the system-wide invariant (someone can always manage
   users/roles), not just "not yourself" — e.g. it also stops a Manager
   from accidentally locking out a *different* Manager. Deliberately
   narrow: only these two permissions are guarded, and only against total
   removal, not against any other permission edit.

**`GET /api/v1/roles` returns `{ roles, modules }`, not a bare
`RoleDTO[]`** — the only REST list endpoint in the app that doesn't return
a plain array. The epic doc's "group permissions by Module" instruction
for `/manager/roles` means the UI needs the full Module/Permission catalog
(including permissions a role doesn't have, to render their unchecked
boxes) alongside each role's current assignment, and there's no separate
modules/permissions catalog endpoint (nor should there be one per the
epic's "no new permission types" scope). Bundling both in one response
was simpler than inventing a second route for ~10 permissions across 2
roles; `RoleSchema` itself still carries only `permissionIds: string[]`.

**`PATCH /api/v1/roles/[id]/permissions` never touches `Role.name`,**
even though `Role.name` is a plain editable string in the schema. Per the
epic doc's own route description ("edit permission assignments per
role"), and because `src/lib/redirector.ts`'s `ROLES.MANAGER`/
`ROLES.INVENTORY_MANAGER` constants are string-compared against
`session.user.role` in `RoleRedirector`, `(dashboard)/layout.tsx`,
`manager/layout.tsx`, and `inventory/layout.tsx` — renaming either seeded
role would silently break those gates (the user keeps their permissions
but gets redirected to `/unauthorized`). `UpdateRolePermissionsInputSchema`
has no `name` field at all, so this isn't a runtime check to remember —
it's unrepresentable.

---

## 2026-11-08 — Epic 6 (Unified Sales Flow) decisions

**The referenceCode collision-retry loop retries the entire `$transaction`,
not just the inner `sale.create`.** Epic 2's `GenerateSku()` pattern
(retry only the single `product.create` call) doesn't carry over directly
here: `POST /api/v1/sales` writes `Sale` + `StockLedgerEntry` +
`StockBalance` (+ `LoanTransaction`/`LoanAccount` for LOAN sales) in one
`prisma.$transaction`, and on Postgres a failed statement (a `P2002` on
`referenceCode`) poisons the rest of that same transaction — a retry of
just the inner create would fail again on the now-aborted transaction.
`POST /api/v1/sales` instead re-runs the *whole* `$transaction` callback
(up to 5 attempts) with a freshly generated `referenceCode` each time;
each failed attempt rolls back cleanly on its own, so the next attempt's
balance/account reads are never stale.

**Walk-in LOAN sales are rejected by the Zod schema itself, not a handler
check.** `CreateSaleInputSchema` is a discriminated union on
`paymentType` (same shape as Epic 5's `CreateLoanTransactionInputSchema`):
the `CASH` branch's `customerId` is optional, the `LOAN` branch's is
required. A walk-in (`customerId` omitted) `LOAN` sale fails schema
validation with a 400 before the handler ever runs — there's no
`LoanAccount` to post a `SALE_ON_CREDIT` transaction against for a
customer that doesn't exist. This is the edge case the epic doc didn't
spell out explicitly; the schema makes the nonsense state unrepresentable
instead of relying on the UI alone.

**`GET /api/v1/sales` (list) was added even though the epic doc's API
section only mentioned `POST /api/v1/sales` and `GET /api/v1/sales/[id]`.**
`/inventory/sales` ("own recent sales") and `/manager/sales` ("read-only
... across all") both need to list multiple sales — every other feature
folder has a list GET alongside its detail GET, so this fills an obvious
gap rather than inventing a new shape. Gated by a single `sale:read`
string (both roles already have it identically); the "own" vs. "all"
distinction is an optional `createdById` query param set by the
`/inventory/sales` page (from its own session) and omitted by
`/manager/sales` — scope is page-level, not permission-level, matching
`StockBalanceList`'s `detailHrefBase` prop split between the Manager and
Inventory Manager views of the same list component.

**No guard against selling more stock than `StockBalance.quantityKg` has
on hand.** The epic doc doesn't ask for one, and Epic 4's `ACCEPT` path
has no corresponding guard either (there's nothing to guard against on
the inbound side). `StockBalance.quantityKg` can go negative after a
sale; the ledger is still the source of truth and nothing currently reads
that negative value as an error state. Flagged here as a deliberate
scope decision, not an oversight — revisit if the business wants a hard
block or a soft warning on overselling.

**Product existence and customer existence are checked with plain
`findUnique`, no `isActive` filter** — matches Epic 4's `stock/accept`
route (which also doesn't filter inactive products) rather than adding
new validation the epic doc never asked for. A sale against an
inactive product or customer isn't blocked server-side; the UI pickers
already filter to `isActive` rows, same as "Accept Stock"'s product
picker.

---

## 2026-11-08 — Epic 5 (Customers + Loans) decisions

**`Customer` always gets a `LoanAccount` at creation time (balance 0),
not lazily on first transaction.** `POST /api/v1/customers` creates both
rows in the same `prisma.$transaction`. This differs from Epic 4's
`StockBalance`, which is upserted lazily on first `ACCEPT` — chosen here
because `api/v1/loans/[accountId]/transactions` is keyed by `accountId`
per the epic doc, so an account must already exist before any loan
activity can be recorded against a customer. Lazy creation would have
required a different (customerId-keyed) route shape.

**`CreateLoanTransactionInputSchema` is a Zod discriminated union on
`type`.** `REPAYMENT_RECEIVED` and `ADVANCE_FROM_CUSTOMER` both always
*decrease* `LoanAccount.balance` (direction is implied by type, per the
model's own comment) — receiving money/value from the customer always
reduces what they owe (or increases what the business owes them).
`MANUAL_ADJUSTMENT` has no implied direction (it's a free-form
correction), so its branch of the union adds an explicit
`direction: "INCREASE" | "DECREASE"` field not present on the other
branch. `balanceAfter` is still computed and stored as a plain signed
snapshot — `direction` itself is never persisted on `LoanTransaction`.

**`POST /api/v1/loans/[accountId]/transactions` is one handler with a
type-conditional permission check inside it, not a route-level gate.**
Route-level `requiresAuth.permission` is `["loan:manage", "loan:record"]`
(either role may call the endpoint at all), but the handler additionally
checks `session.permissions.includes("loan:manage")` and returns 403 when
`body.type === "MANUAL_ADJUSTMENT"` and that check fails — `CreateApiRoute`
has no per-request-body permission hook, so this couldn't be expressed as
route-level config. Mirrors the epic doc's explicit callout that this is
"a type-conditional permission check inside one handler, not a
route-level gate."

**`GET /api/v1/customers`, `GET /api/v1/customers/[id]`, and both
`GET`/`POST` on `/api/v1/loans/[accountId]/transactions` use the
`string[]` ANY-of form of `requiresAuth.permission`** (e.g.
`["customer:manage", "customer:read"]`, `["loan:manage", "loan:record"]`)
rather than a single string — continuing Epic 4's
`CheckAnyPermission` convention. Both roles in each pair need read access
to these endpoints at different permission grain (Manager via the
"manage" permission, Inventory Manager via the narrower "read"/"record"
permission), and relying on Manager's seed happening to also include the
narrower permission (because `seedRoles` currently grants Manager *every*
permission) would silently break if that seed ever changed to be more
selective. `GET /api/v1/loans` (the Manager-only oversight queue) stays a
single `"loan:manage"` string — Inventory Manager has no page that reads
cross-customer oversight data.

**`Customer.name` has no unique constraint** (unlike `Category.name`),
matching the schema literally from the epic doc. Two customers can share
a name (e.g. two different people both named "Alem" at different
locations) — `POST /api/v1/customers` has no `P2002` handling because
that error can't occur from a duplicate name.

**Edit/deactivate for a customer lives on `/manager/customers`'s list
(inline row editing), not on `/manager/customers/[id]`.** Matches the
`CategoryManager` pattern from Epic 2 and the epic doc's own page table,
which lists "list + create/edit/deactivate" under `/manager/customers`
and reserves `/manager/customers/[id]` for "profile + loan ledger +
manual adjustment + repayment." The detail page's customer header is
read-only.

---

## 2026-11-07 — Epic 4 (Stock) decisions

**`CreateApiRoute`'s `requiresAuth.permission` now accepts `string | string[]`.**
A `string[]` grants access if the session has *any one* of the listed
permissions, via the existing (previously page-only) `CheckAnyPermission`
helper from `src/lib/session.ts`. The single-string path is untouched —
still calls `CheckPermission` exactly as before, so no existing route's
behavior changed. Added because `GET /api/v1/unit-conversions` needed to
stay `unit-conversion:manage`-only for writes but also be readable by
`stock:accept` holders (see next entry) without handing Inventory Manager
write access to units.

**`GET /api/v1/unit-conversions` is now `["unit-conversion:manage", "stock:accept"]`;**
POST/PATCH/DELETE on that resource stay `unit-conversion:manage` only. The
"Accept Stock" form needs the live unit list to populate its unit dropdown,
but Inventory Manager must not be able to create/edit/deactivate units via
the API (even though they can't reach `/manager/settings/units` — the
`ManagerLayout` role gate — a permission-only check would otherwise still
let them hit the write routes directly). This mismatch was flagged as a
"revisit if" in Epic 2's categories decision below; Epic 6 ("Record Sale")
will need the same read access for the same reason, so this isn't
stock-specific plumbing.

**Added `product:read` to `INVENTORY_MANAGER_PERMISSIONS` in `prisma/seed.ts`.**
Same gap as above, for the product picker on "Accept Stock". Inventory
Manager was never granted `product:read` despite needing to look up
products — Epic 6's "Record Sale" needs this regardless of stock, so this
is a correction, not a scope creep.

**`StockBalance` rows are created lazily (`upsert`), not backfilled for
existing products.** `GET /api/v1/stock` starts from `Product.findMany`
with an `include: { stockBalance: true }` rather than
`StockBalance.findMany`, so every active product appears in the balance
list even before its first ACCEPT — `quantityKg` defaults to `"0"` and
`updatedAt` is `null` (meaning "never accepted") in the DTO, matching the
nullable-optional-scalar convention in `AGENTS.md` rather than omitting the
row.

**`StockLedgerEntry.inputRatioToKg` is read via a second
`prisma.unitConversion.findUnique`, not derived from `convertToKg`'s
return value.** `convertToKg(unitName, qty)` returns only the computed
`quantityKg` number; snapshotting the ratio itself (not the kg conversion)
needs the `UnitConversion` row directly. This is a plain read of the same
table `convertToKg` already validated against, not a second conversion
implementation — the kg math itself only ever happens inside
`convertToKg`, per the epic doc's "don't reimplement conversion logic."

---

## 2026-11-07 — Epic 3 (Unit Settings) decisions

**`convertToKg(unitName, qty)` lives in `src/features/unit-conversions/services/convert-to-kg.service.ts`**
and is a server-side Prisma helper, not an axios-based client service like
`unit-conversion.service.ts` in the same folder — despite the `.service.ts`
suffix matching the feature's existing naming convention, it talks to
`prisma` directly rather than `/api/v1/unit-conversions` over HTTP, since
Epic 4's "Accept Stock" and Epic 6's "Record Sale" API route handlers will
call it in-process, not over the network. Kept the lowerCamelCase
`convertToKg` name exactly as Epic 3's doc specifies (rather than the
repo's usual PascalCase function convention) because Epics 4 and 6 import
it by that literal name.

**`convertToKg` validates `unitName` by fetching all active
`UnitConversion` rows and checking membership with a dynamically-built
`z.enum(...)` of their names** — not a hand-rolled `includes()` check —
per the epic doc's explicit "Validate unitName against the live table with
Zod, not the type system." Throws a dedicated `UnknownUnitError` (exported
alongside it) rather than a generic `Error`, so Epic 4/6 call sites can
catch it specifically and map it to a 400 instead of a 500. Lookup is an
exact string match against the stored `unitName` (which is uppercased on
create) — callers must pass the stored casing; it does not normalize case
on the read side, matching the UI's unit list exactly.

**`convertToKg` uses `Prisma.Decimal` (`new Prisma.Decimal(qty).times(unit.ratioToKg)`),
not plain `number` multiplication,** for the ratio multiply itself, to
avoid float-precision drift on the one piece of math this helper owns —
consistent with the project's existing practice of treating money/ratio
fields as `Decimal` everywhere except at the DTO boundary.

**`UpdateUnitConversionInputSchema` has no `unitName` field** — PATCH can
only change `ratioToKg`/`isActive`, matching the epic doc's route table
("PATCH ratio/active") literally. Renaming a unit after creation isn't
supported; deactivate and create a new one instead. `CreateUnitConversionInputSchema`
uppercases `unitName` on input (`CARTON` not `carton`) for consistency
with the doc's naming convention, since there's no enum to enforce it.

**`/manager/settings` is a new "hub" page pattern** — Epic 3 is the first
settings-style page that isn't a flat list; it just links to
`/manager/settings/units`. Future epics adding more Manager settings
screens should add their link to that page's `SETTINGS_LINKS` array rather
than inventing a new hub.

---

## 2026-11-07 — Epic 2 (Categories + Products + Pricing) decisions

**`responseSchema` added to `CreateApiRoute`.** Epic 2's doc flagged this as
the right place to establish the response-shape Zod validation convention
mentioned in Epic 1's parent plan (Epic 1 never added it — the health
check route has no meaningful shape to validate). `IApiHandlerConfig` now
takes an optional `responseSchema: ZodType<R>`; `CreateApiRoute` validates
the handler's return value against it before sending the response and
returns a 500 (logged with the Zod issues) if a handler drifts from its
documented shape. Handlers may still return a `NextResponse` directly to
bypass this (error responses, 404s) — only the "successful" return path is
validated. All `api/v1/categories*` and `api/v1/products*` routes use it.

**Product creation doesn't take a price.** `POST /api/v1/products` creates
a bare product (name + category only); there's no price field on
`/manager/products/new`. Setting the first price happens via the same
"set new price" action used later, on `/manager/products/[id]` right after
creation — matches the API shape literally (prices are a sub-resource of
an existing product, `api/v1/products/[id]/prices`) and avoids a special
case for "price at creation time" vs. "price change later." A product can
exist with zero `Price` rows (valid per the schema); `currentPrice` on the
DTO is `null` until a price is set.

**Money crosses the wire as a string, not a `Decimal`/number.** Prisma's
`Decimal` fields (`Price.amountPerKg`) aren't JSON-safe as live objects —
`responseSchema`'s `safeParse` runs on the raw handler return value before
`NextResponse.json()` serializes it, so a schema expecting a string would
reject an actual `Decimal` instance. DTOs convert with `.toString()` in
the `To*DTO` mappers (`src/features/{categories,products}/validators/*.schema.ts`)
and schemas validate `z.string()`. Avoids silent float-precision loss too.
Input (`SetNewPriceInputSchema`) still accepts a JSON number via
`z.coerce.number()` for a plain `<input type="number">`.

**SKU generation retries on collision instead of failing.** The existing
`GenerateCode()` (`src/lib/generate-code.ts`) has no uniqueness guarantee.
`POST /api/v1/products` wraps `prisma.product.create` in a retry loop (5
attempts) that only retries on a Prisma `P2002` unique-constraint error on
`sku`; any other error or exhausting the attempts rethrows. Also added a
local `GenerateSku()` wrapper there — `GenerateCode()`'s declared return
type is `string | undefined` (it swallows its own parse errors), which
isn't assignable to Prisma's required `sku: string`; the wrapper throws
instead of silently writing `undefined`.

**`GET /api/v1/categories` is gated by `category:manage` only** — including
for the product create/edit forms' category dropdown, which also needs
the list. Epic 2's permission table only assigns `category:manage` to the
categories page; there's no separate "read categories for a dropdown"
permission. This works today because the only role with `product:manage`
(`MANAGER`) also has `category:manage` — RBAC is seeded data, not an enum
(see the 2026-11-06 "RBAC modeled as data" entry below), so this isn't
hard-coded, just not yet exercised by a role that would expose the gap.
Revisit if a future role gets `product:manage` without `category:manage`.

**`Price.createdById` stays a plain string, not a relation.** Epic 2's
schema snippet declares it as `String`, no `@relation` to `User` — kept
exactly as specified rather than adding a join for convenience. Price
history in the UI shows the raw id, not a resolved user name.

**`DELETE /api/v1/categories/[id]` soft-deactivates, not hard-deletes** —
sets `isActive = false` via the same `prisma.category.update` path as
PATCH, per Epic 2's "PATCH, DELETE/deactivate" route note. No category row
is ever actually deleted through this API.

**Ran `npx next typegen` after adding the first dynamic route segment.**
`/manager/products/[id]/page.tsx` uses `PageProps<'/manager/products/[id]'>`
(the typed-routes helper from `src/app/layout.tsx`'s existing
`LayoutProps<"/">` pattern) — but the literal route union is generated
into `.next/types` and wasn't yet aware of this new segment, so TypeScript
rejected the literal until `next typegen` ran once. Note for later epics:
any new dynamic route needs this (or a `next dev`/`next build` pass) before
`PageProps<'...'>` will type-check.

---

## 2026-11-07 — Opted the whole app out of Instant Navigation validation at the root layout

`next.config.ts` already had `cacheComponents: true` (pre-existing, not
added for this work). Under Cache Components, Next 16 validates every
Page/Default segment for "instant navigation" by default and throws a dev
warning — `blocking-prerender-dynamic` — for any uncached `headers()`/
`cookies()` access outside `<Suspense>`. Epic 1's pages all gate on
session (`GetSession`/`GetApiSession`/`CheckPermission`, which call
`headers()`), so every real route tripped it.

Considered wrapping each session check in `<Suspense>` or caching with
`"use cache: private"` per-route, but rejected both: this app has no
public/cacheable page to begin with (everything meaningful sits behind
auth by design), and `"use cache: private"` explicitly can't be part of
the static shell anyway. Added `export const instant = false;` to the root layout
(`src/app/layout.tsx`) first, expecting it to cover the whole tree per the
docs' "Setting false on the root layout disables static shell validation
for the entire app." In practice that alone did not suppress the error on
`/` itself — the root layout's `instant = false` addresses the *static
shell* validation specifically, not the per-segment instant-navigation
block check, and a segment that itself makes the blocking call still gets
flagged independently of an ancestor's declaration. Had to also add
`export const instant = false;` directly to every page/layout file that
itself calls `GetSession`/`GetApiSession`/`CheckPermission` in its own
body: `src/app/page.tsx`, `src/app/auth/layout.tsx`,
`src/app/(dashboard)/layout.tsx`, `src/app/(dashboard)/manager/layout.tsx`,
`src/app/(dashboard)/manager/dashboard/page.tsx`,
`src/app/(dashboard)/inventory/layout.tsx`,
`src/app/(dashboard)/inventory/dashboard/page.tsx`. Kept the root layout's
export too, for the static-shell check and as the default for any future
file that forgets to declare its own. Per Next's own docs this only
silences the validation insight — it doesn't disable `cacheComponents` or
change runtime behavior. **Convention going forward:** any new
page/layout that directly calls a session-reading function should add
this same `export const instant = false;` line itself — don't rely on an
ancestor's declaration to cover it. Revisit if a genuinely public,
cacheable route is ever added.

## 2026-11-07 — Used `src/proxy.ts`, not `middleware.ts`, for coarse auth redirects

The original plan called for a `middleware.ts` doing a cookie-presence
check before `/manager/*`/`/inventory/*` render. Next.js 16 deprecated
`middleware.js|ts` and renamed the convention to `proxy.js|ts` (same
behavior, same file location rules, just a renamed file/export — see
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).
Implemented as `src/proxy.ts` exporting `proxy()` + `config.matcher`
instead. Uses `getSessionCookie` from `better-auth/cookies` for a cheap
cookie-presence check with no DB call — real role/permission enforcement
still happens in `GetSession()`/`CheckPermission()` at the layout/page/API
layer, per Next's own guidance that Proxy shouldn't be the sole
authorization mechanism.

**Correction (same day):** the proxy originally also redirected
cookie-present requests away from `/auth/*` back to `/`, as an optimistic
UX nicety. That caused an infinite redirect loop: a stale/expired cookie
(present but invalid in the DB) made the proxy's cheap check and
`src/app/auth/layout.tsx`'s authoritative `GetApiSession()` check disagree
— `/` would redirect to `/auth/sign-in` (no valid session), and the proxy
would immediately bounce that back to `/` (cookie present), forever.
Removed that branch; the proxy now only redirects unauthenticated
requests *away from* protected routes (`/manager/*`, `/inventory/*`),
never *into* `/`. Sending a genuinely-authenticated user away from
`/auth/sign-in` is left entirely to the layout's real DB-backed check,
which was already correct. `config.matcher` narrowed to drop `/auth/:path*`
accordingly.

## 2026-11-07 — Full-domain page/route map and 8 phased Epics planned

Planned the entire business-domain build (products, pricing, units, stock,
customers/loans, sales, users/RBAC UI, analytics) up front rather than
designing one feature at a time, since the features are interdependent
(e.g. sales needs products, units, stock, and loans all at once) and
planning them in isolation risked rework. Documented as 8 dependency-
ordered epics under `docs/epics/` (see `docs/epics/README.md` for the
index) so a future session can execute one epic without re-deriving the
architecture. The decisions below came out of that planning pass.

## 2026-11-07 — Stock and loan balances: cached column + append-only ledger (hybrid)

`StockBalance`/`LoanAccount.balance` are cached projections, updated in
the same DB transaction as each `StockLedgerEntry`/`LoanTransaction`
insert. Considered deriving the balance as `SUM(ledger)` on every read
instead — rejected for query simplicity on dashboards (Epic 8) that need
balances across many products/customers at once. The ledger tables remain
the audit-trail source of truth; if balance and ledger-sum ever disagree,
that indicates a write that skipped the shared transaction, not a modeling
bug.

## 2026-11-07 — `UnitConversion.unitName` is a string, not a Prisma enum

The spec requires unit conversion ratios (Carton/Packet/Wax/Kir → KG) to
be Manager-editable at runtime via a settings page. A Prisma enum would
require a code deploy to add, rename, or retire a unit, defeating the
point of a settings page. Traded weaker compile-time type safety on
`Sale.inputUnitName`/`StockLedgerEntry.inputUnitName` for runtime
flexibility — validate against the live `UnitConversion` table via Zod
instead of the type system.

## 2026-11-07 — `Sale` and `StockLedgerEntry` snapshot ratio/price at transaction time

`Sale.inputRatioToKg`/`unitPriceAtSale` and
`StockLedgerEntry.inputRatioToKg` are denormalized copies of
`UnitConversion.ratioToKg`/`Price.amountPerKg` at the moment of the
transaction, not live joins. Editing a unit ratio or a product's price
later must never retroactively change the totals on historical sales or
stock entries — these fields are deliberately *not* true foreign keys to
`UnitConversion`/`Price` for that reason.

## 2026-11-07 — `Sale` is single-product-per-transaction (no `SaleLine`)

Modeled one product + quantity directly on `Sale` rather than a
`Sale` header + `SaleLine[]` child table, matching the literal "pick
product and quantity" framing of the unified sale-flow requirement.
Multi-item carts would need a real migration later (move product/qty/price
onto a new `SaleLine`, demote `Sale` to a header row) — deferred as a
known, deliberate limitation rather than an oversight. Revisit if/when a
single checkout needs to cover more than one product.

## 2026-11-07 — `LoanAccount.balance` sign convention

Positive balance means the **customer owes the business**; negative means
the **business owes the customer** (e.g. an unredeemed advance). Recorded
here because it's easy to get backwards once UI is built on top of it —
any new loan-related screen or calculation must respect this sign, not
invert it.

## 2026-11-07 — Loan repayment with no attached sale: both roles can record it

A customer can pay down an outstanding loan balance without making a new
purchase — this isn't covered by the unified sale flow (Epic 6), so Epic 5
adds a stand-alone "Record Repayment" action. Decided both roles can use
it (Inventory Manager for day-to-day repayments, Manager for repayments
plus manual adjustments) rather than restricting it to Manager — matches
the "loans split by action" decision that Inventory Manager owns routine
loan activity while Manager retains oversight and correction authority.

## 2026-11-07 — REST for CRUD, GraphQL reserved for cross-resource aggregation

Established the convention (previously undecided — both `CreateApiRoute`
and `CreateGraphqlRoute` only served an identical trivial health check):
REST (`src/app/api/v1/<resource>/route.ts`) for all CRUD and
single-resource mutations tied to one form (products, categories, prices,
unit-conversions, customers, users, roles, stock/accept, sales, loan
adjustments). GraphQL (`src/app/api/graphql/route.ts`) reserved for the
Manager analytics dashboard (Epic 8), which combines sales/stock/loan
aggregates from multiple resources in one flexible-shaped request — a
poor fit for REST's one-resource-per-endpoint shape. Inventory Manager's
simpler dashboard can stay REST.

## 2026-11-06 — CLAUDE.md as a pointer file, not a symlink

Wanted `CLAUDE.md` to be a real symlink to `AGENTS.md` (the open-standard
handoff file) so there's one source of truth. The auto-mode permission
classifier blocked `ln -s` as a bash action. Used a one-line stub file
("see AGENTS.md") instead.

**Why this is fine, not just a workaround:** symlinks aren't universally
reliable anyway — they need `core.symlinks` on in git and can silently
become plain text files on some Windows checkouts. The stub file is more
portable. If a real symlink is ever wanted, recreate it manually (outside
auto mode) and delete the stub.

## 2026-11-06 — Didn't fix the `next build` `/_global-error` crash

`pnpm build` crashes prerendering Next's internal `/_global-error` page
(`Cannot read properties of null (reading 'useContext')`). Isolated it to
a genuine Next 16.4.5 + React 19.3 framework bug: reproduces on a bare
scaffold with no custom providers, with Turbopack *and* `--webpack`, with
experimental flags (`reactCompiler`/`cacheComponents`/`partialPrefetching`)
on or off.

**Decision:** documented it, did not downgrade Next/React. Pinning to
older framework versions is a bigger call than this task warranted, and
it doesn't block `pnpm dev` or the Docker build (which only needs
`prisma generate` + `next build`'s webpack path to work around it — see
below). Revisit if/when Next or React ship a fix, or if production builds
become urgent before that happens.

## 2026-11-06 — Dockerfile build stage gets a placeholder `DATABASE_URL`

`prisma generate` in the Docker build stage was failing because
`prisma.config.ts` resolves `DATABASE_URL` eagerly and `.env` isn't copied
into the build context (by design, via `.dockerignore`). `prisma generate`
only needs the URL string to exist — it never opens a connection — so the
build stage sets a literal fake value (`postgresql://build:build@...`)
before `RUN pnpm prisma generate`. The real value is injected at runtime
via `docker-compose.yml`'s `env_file`, so this never reaches the running
container.

## 2026-11-06 — `prisma.config.ts` loads `.env` itself

Prisma 7's new config system disables its own `.env` auto-loading when
evaluating `prisma.config.ts` (confirmed in `@prisma/config`'s source:
`dotenv: false` in its c12 loader config). Any `prisma` CLI command run
without the shell already having `DATABASE_URL` exported fails with
`PrismaConfigEnvError`. Fixed by calling `process.loadEnvFile()` at the
top of `prisma.config.ts` (Node 20.12+/21.7+ built-in, no `dotenv`
dependency needed), wrapped in try/catch so it doesn't throw when no
`.env` exists (CI, Docker).

## 2026-11-06 — Pinned the `prisma` CLI to `7.10.1`, not `latest`

`pnpm add -D prisma` resolved to `8.0.0-rc.30` (the `latest` dist-tag) and
pulled a huge, flaky optional-dependency tree through `@effect/vitest` →
`effect` (including things like `alchemy`, `@distilled.cloud/*`,
`@cloudflare/workerd-linux-64`) that kept timing out against the npm
registry. Pinned to `7.10.1` to match the already-installed
`@prisma/client@^7.10.1` and `@prisma/adapter-pg` — avoids the RC's
dependency tree entirely and keeps CLI/client versions in lockstep.
Revisit once Prisma 8 is stable and the project is ready to upgrade.

## 2026-11-06 — RBAC modeled as data (`Role`/`Permission`/`Module` tables), not an enum

Only two roles exist today (Manager, Inventory Manager), which would be
simpler as a `Role` enum on `User`. Modeled it as real tables instead
because the spec explicitly says the Manager manages "permission" as a
first-class thing from the UI — an enum can't be edited at runtime.
Seed data (not yet written) should still only create the two roles; the
schema just doesn't hard-code that assumption.

## 2026-11-06 — better-auth instead of the existing next-auth scaffold

The reused `src/lib/auth-options.ts` was next-auth-based but referenced
several files that didn't exist (`@/configs/global-vars`,
`@/features/auth/services/sigin.service`, `@/generated/prisma/client`,
`@/types/next-auth`) — it was unwired scaffolding, not working code. The
project's required stack explicitly lists better-auth. Replaced it
entirely: `src/lib/auth.ts` (better-auth server instance, `username` +
`customSession` plugins), `src/lib/auth-client.ts` (React client),
`src/lib/session.ts` (`GetApiSession`/`CheckPermission`/etc.). The REST and
GraphQL API factories (`src/lib/api-handlers/*.ts`) were updated to match
the new session shape rather than kept generic against both.

## 2026-11-06 — Docker Compose renamed from `rastech` to `adika-candle`

The compose file was a straight copy from a prior project (`rastech`
naming throughout: services, containers, network, volume, DB credentials).
Renamed everything to match this project, and fixed a bug while at it: the
Postgres volume was mounted at `/var/lib/postgresql` instead of
`/var/lib/postgresql/data` (the actual data directory for the official
Postgres image) — would have silently stored nothing durably.
