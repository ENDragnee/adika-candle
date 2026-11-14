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

## 2026-11-14 — Sidebar groups (Epic 25)

- **Groups follow access level, from everyday to admin-only.** The order is Daily work → Insights → Catalog → People & access → System, with Dashboard on top and Legend at the bottom (no headings for those two). A role sees only the groups it has pages in, so the sidebar grows with the role:
  - Inventory Manager: Daily work.
  - Manager: everything except System.
  - Admin: everything.
- Defined once on each route (`group` in `src/lib/nav-routes.ts`); `BuildNavRoutes` returns routes in group order. So `HomeRouteFor`, the mobile bar's first three slots (now Dashboard, Sales, Stock) and the "More" menu sections all follow it.
- **Collapsible, because the Admin has 16 links.** Without folding they overflow a laptop-height sidebar.
  - Folding only appears when there are 2+ headed groups; the Inventory Manager's single group stays a plain heading.
  - Folded groups are remembered per browser (`localStorage`).
  - Navigating into a folded group opens it, so the current page is never hidden.
  - The product tour expands all groups first.
  - Folded lists are `inert`, so they're out of the tab order.
  - In icon-only mode, groups become dividers and every icon stays visible (an icon in a folded group would be unreachable).

## 2026-11-14 — Epic 24 (Admin controls) decisions

- **Settings live in one `SystemSetting` table**, one JSON row per group, validated by Zod with defaults.
  - A missing or invalid row falls back to the defaults instead of breaking requests.
  - Reads are cached in-process for 5s, because `customSession` checks maintenance mode on every request.
  - Next.js bundles pages and route handlers separately, so a change can take up to 5s to reach every module.
- **Lockout runs in the better-auth sign-in hooks, not in middleware.**
  - A locked account is refused *before* its password is checked.
  - Failures are counted with an atomic increment. Refusals for lockout or maintenance aren't counted as failed guesses.
  - The maintenance refusal is the same for unknown usernames, so it doesn't reveal which accounts exist.
- **Forced password change and maintenance withhold permissions in `customSession`**, the same way deactivation does (Epic 7), so every existing permission check enforces them for free. Layouts and `RoleRedirector` do the redirects.
  - `CreateApiRoute` gained `permission: null` (any signed-in user) for the person's own account endpoints.
- **The period lock guards void and restore only.** Every write is dated "now", so voiding an old sale is the only way to change a closed period's reports (analytics drop voided sales from the day they were made). The latest lockable day is yesterday.
- **Restore is a mirror of void, with its own `SALE_RESTORE` ledger types.** It does not reuse `SALE`, so history reads truthfully.
  - The loan amount re-posted is "voids minus restores so far", which keeps repeated cycles exact.
  - Like a new sale, it refuses when the stock isn't on hand.
- **Log purge is manual only.** The app has no scheduler, and silent deletion should be a person's decision. The purge entry is written after the delete, so it survives.
- **The backup is a logical JSON export, not `pg_dump`** (not available to the app).
  - It excludes `Account`, `Session` and `Verification`, so there are no hashes or tokens.
  - It is taken in one repeatable-read transaction, so balances match ledgers.
  - There is no UI restore: overwriting live data is an operator task.

## 2026-11-14 — Epic 23 (Admin role) decisions

- **Admin is defined by one admin-only permission (`session:manage`), not by role name.** The Manager keeps every other permission. This reverses the earlier seed note ("no separate admin role; the Manager is the administrator"), at the owner's request.
- **Access containment instead of a hard-coded role hierarchy.** A role or account is "within reach" only when the actor holds every one of its permissions.
  - A rank list (Admin > Manager > …) would break as soon as someone creates a custom role. The permission-set rule needs no list.
  - Without containment the Admin role means nothing: the Manager could assign it to themselves, or reset the Admin's password.
  - Enforced in the API (`src/lib/server/access-containment.ts`). The UI only mirrors it.
- **`session:manage` joins `role:manage`/`user:manage` as a guarded permission.** At least one role must always hold it.
- **Revoking means deleting `session` rows.** This works immediately only because `src/lib/auth.ts` configures no `cookieCache`. If one is ever added, revocation is delayed by up to its max age.
- **"Last used" is `session.updatedAt`.** better-auth refreshes it about once a day (`updateAge`), so it means "recently used", not a live heartbeat.
- **Email is not editable.** Sign-in is by username, and email is the better-auth identity.

## 2026-11-12 — Epic 22 (Platform Features) decisions

**The activity log is written by the API layer, not by each feature.**
`CreateApiRoute` records every successful non-GET request after the
handler returns. A route describes its event with an optional `activity`
function (actor, action, record, summary, changes); a route without one
still gets a generic entry (method, path, redacted input), so a new
mutating route can't silently skip the log. Sign-in, failed sign-in and
sign-out come from better-auth `hooks` (`src/lib/activity/auth-activity.ts`)
because those endpoints bypass `CreateApiRoute`. Logging is best-effort
after the change commits: a failed log write is reported to the server
console but never turns a successful request into an error. Writing the
log inside every service transaction was rejected as far more invasive
for little gain. Secrets are redacted by key name. `record-activity.ts`
uses `console.error`, not the pino logger, because better-auth loads it
inside page renders, where pino's pretty-print worker transport can't start.

**Activities use cursor pagination on (createdAt, id); every other list
uses offset.** The log only grows at the top, so offset pages would shift
and repeat rows as new entries arrive. Sortable/filterable lists keep
offset paging (page numbers and totals are useful there) behind one
`Pagination` control and the `usePagination`/`useListParams` hooks.
Analytics tables are computed in memory, so `DataTable` pages them in the
browser (`clientPageSize`).

**Errors are handled centrally in `QueryProvider`.** Mutations declare
`meta.errorTitle` instead of hand-writing toasts; failures show one toast
with a Details action (error dialog with code and the response's
`x-request-id` as a reference). A 401 anywhere shows one "session ended"
toast and redirects to sign-in with `?next=` (followed only if it is a
same-site path). 4xx errors are never retried. A query's *first* load that
fails throws to the route's `error.tsx` (`ErrorState`); a failed background
refetch keeps the data on screen and only toasts.

**Route `loading.tsx` skeletons mean page-level permission redirects are
streamed.** Once the skeleton has been sent, a page's `redirect()` arrives
as a streamed client redirect (meta refresh + RSC instruction) rather than
an HTTP 307. Nothing from the protected page is rendered. We accepted this
so navigation never shows a blank screen. API routes still answer
401/403 directly.

**Custom roles: the two built-in roles keep their names.** `MANAGER`
decides which sidebar area a user sees, so built-in roles can't be renamed
or deleted, and any role with users can't be deleted. The post-sign-in
redirect now comes from permissions (`HomeRouteFor` in
`src/lib/nav-routes.ts`), so a custom role lands on the first page it can
open. The navigation's route/permission list moved to `nav-routes.ts`
(no icons) so server code can share it.

**Password reset stays Manager-only (owner's choice); the rules are one
shared policy** (`src/lib/password-policy.ts`) used by the Zod schemas and
the live checklist. "Doesn't contain the person's name" is checked in the
route, where the account is known. "Sign out everywhere" deletes the
user's sessions but keeps the Manager's own current one when they reset
their own password.

**Motion: the count-up "wonkiness" was a bug, not a timing problem.**
`useCountUp` listed `format`, which every caller passes inline, as an
effect dependency, so any re-render reset the number to 0. `format` is now
read through a ref; the hook counts once on mount and then eases between
values. Timings live in `motion-tokens.ts`.

**Tablet layout: the sidebar collapses below 1024px by default**, with
a separate remembered preference for each width class, and `DataTable`
switches to a two-column card grid below `lg` (it used to switch at `md`).

**Tab state uses `window.history.replaceState`, not `router.replace`.**
Next syncs native history calls with `useSearchParams`, and a tab switch
isn't a navigation. `router.replace` re-ran the route crossfade on every
tab click, and quick clicks threw "Transition was aborted".

**Icons in components that Server Components import come from
`@phosphor-icons/react/ssr`** (`Button`, `DataTable`). The default entry
creates React context, which crashes server rendering.

---

## 2026-11-12 — Epic 21 (Manager UX & Logic Audit Fixes) decisions

**Profit and margin are computed over costed sales only; uncosted sales
make them `null`, never 100%.** Before, `BuildProfitability` added every
sale to revenue but only costed sales to cost, so a window with no cost
data reported 100% margin. `src/features/analytics/server/profitability.ts`
now tracks `costedRevenue` separately; `totalProfit`/`averageMarginPercent`
are nullable, and the UI renders null as "—" with a coverage meter
("Cost data covers N% of revenue"). Per-product rows split *realized*
margin (from sale snapshots) from *current* margin (today's price/cost) —
mixing the two in one row is what made the old table self-contradictory.

**One stock-status rule, shared client and server
(`src/features/stock/stock-status.ts`), with two new statuses.**
`NEGATIVE` (balance < 0 — a data problem, not "empty") and `UNTRACKED`
(stocked but no threshold — previously reported as `HEALTHY`, which hid
that nothing was being tracked). The Dashboard and Stock Health had
separate rules and disagreed on the same data. It takes plain numbers,
not Decimals, because it must run in client components and only compares
kg (never money).

**Overselling: soft block, not hard block.** `POST /api/v1/sales` answers
`409 INSUFFICIENT_STOCK` (with `availableKg`) unless the request carries
`allowOversell: true`; the Record Sale dialog shows on-hand stock up front
and asks for explicit confirmation. A hard block was rejected because a
wrong recorded balance would then stop real sales; instead, the new stock
count (below) is the way to fix the number afterwards. Reverses the Epic 6
"no guard" call only as far as requiring an explicit confirmation.

**Stock counts, not free-form adjustments.** The `ADJUSTMENT` ledger type
finally has a writer: `POST /api/v1/stock/[productId]/count` and
`/raw-materials/[id]/count` take the *counted* quantity and a required
reason; the server computes the difference under a row lock and writes it
as one signed ADJUSTMENT. Entering the count (not the delta) is what staff
actually know after a stock-take, and the lock stops a concurrent sale
from making the correction overshoot. New permission `stock:adjust`
(Manager). Raw-material ADJUSTMENT `quantityKg` is stored *signed* — the
one exception to that ledger's "positive magnitude, direction by type"
rule, since a correction has no implied direction (documented on the
schema field).

**Sales are voided, never edited or deleted.** `POST /api/v1/sales/[id]/void`
(permission `sale:void`) sets `voidedAt`/`voidedById`/`voidReason` and
writes reversing `SALE_VOID` entries (new enum value on both
`StockEntryType` and `LoanTransactionType`) in one transaction. Every
analytics query filters `voidedAt: null`; the production report nets
SALE_VOID out of "sold". In-place edits were rejected because a sale's
stock and loan effects are already in two ledgers — void + re-record keeps
both ledgers append-only and auditable. To allow a voided sale's reversal
entries to reference it, `StockLedgerEntry.saleId` and
`LoanTransaction.saleId` are no longer `@unique` (`Sale` now has
`stockLedgerEntries[]`/`loanTransactions[]`).

**On-account sales spend existing credit first (`ADVANCE_REDEEMED`).** If
the customer's balance is negative (they paid in advance), the sale posts
`ADVANCE_REDEEMED` for `min(total, credit)` and `SALE_ON_CREDIT` only for
the remainder. The account row is locked (`SELECT … FOR UPDATE`) while the
split is computed. The enum value existed since Epic 5 but nothing wrote
it, so spending an advance read as "went into debt". UI calls `LOAN`
"On account".

**Cached balances update with atomic increments
(`src/lib/ledger-balance.ts`).** Read → compute → `update({ value })`
inside `$transaction` loses writes under Postgres READ COMMITTED (two
sales both read 100 and both write 90). `{ increment: delta }` compiles to
`SET col = col + delta`, which serializes on the row lock; the returned
row supplies the ledger's `balanceAfter`. Applied to stock, raw materials
and loans.

**Day/week/month buckets use the business time zone
(`BUSINESS_TIMEZONE = "Africa/Addis_Ababa"`, `src/lib/business-time.ts`).**
UTC buckets put a 01:30-local sale on the previous day. Implemented with
`Intl.DateTimeFormat` only (no date library). Every displayed time also
formats in that zone (`src/lib/format.ts`), so a person in another zone
sees the same "day" the reports use. Best Sellers moved from a rolling
`now − days` window to the same midnight-aligned windows as the other
reports.

**Navigation and area access follow permissions, not role names.** Before,
`/manager/*` admitted only the role named `MANAGER`, so most Roles-page
toggles had no visible effect. Now the area layouts only require an active
role, every page checks its own permission (they already did), and
`BuildNavItems` (`nav-config.ts`) filters the role's own nav by permission
and appends any Manager page the role was granted. The two areas
(`/manager`, `/inventory`) were kept rather than merged into one route
tree — merging would be a much larger change for no user-visible gain.
Self-lockout guard: the Roles API refuses to remove `role:manage` from the
caller's own role, and the switch is locked in the UI. The product tour
skips steps for nav items the user can't see.

**Analytics computations live in `src/features/analytics/server/*` as pure
functions with unit tests;** the GraphQL route is schema + wiring only
(it had grown to ~960 lines of untested logic). The Dashboard's "needs
attention" items are structured data (`kind` + numbers), not server-written
sentences, so the client formats every number and date.

**Charts stay hand-built (Epic 17's call stands), extended rather than
replaced:** a shared nice-ticks scale (`chart-scale.ts`), value axes,
`null` gaps in line charts (no-data days are gaps, not zeros), stacked
cash/on-account bars, tooltips, and a reference line for alert levels. The
existing validated `--chart-series-1/2` and `--status-*` tokens were
reused; no new palette. Status colors appear only on tints and icons, with
the label in text ink (`ToneBadge`), because yellow/orange text fails
contrast on light surfaces.

**Money is formatted as ETB with 2 decimals everywhere** (`FormatMoney`);
CSV exports keep raw numbers (spreadsheets need numbers), PDF uses the
formatted ones. Customer balances are shown in words ("Owes you" /
"Credit" / "Settled") instead of a signed number; exports keep the signed
number with the sign spelled out in the column header.

**Production variance beyond ±10% is highlighted** — a judgment call for
"worth a look", not a business rule; change `VARIANCE_WARNING_PERCENT` in
`production-tab.tsx` if the factory wants a different tolerance.

---

## 2026-11-10 — Roles permission matrix + collapsible sidebar (outside the epic sequence)

**Two separate requests, landed back to back on the same day as the
plain-language Roles/Settings round above**: "Update the role UI to use
a internal side bar to select the role and on the right to have a
permission matrix," then mid-session, "The sidebar looks generic upgrade
it's look better and Make it look premium, add a sidebar collapser too.
Also some padding to the shell."

**Roles page restructured again — card-per-role replaced with a
role-picker + single-role data table.** Asked the user to pick between
two genuinely different "matrix" readings before building (single role
selected via sidebar vs. all roles as comparison columns) rather than
guessing — picked single-role, table rows = permissions. `RoleManager`
now holds `selectedRoleId` state; `RoleSidebar` is a row of `Button`s
(`md:flex-col` for a real left sidebar, a horizontal row below `md` —
two roles fit with no scrolling) swapped for whichever role's data
should render. **The matrix reuses `DataTable<T>`, not a hand-rolled
table**, specifically so it inherits the mobile card-view fallback every
other list in this app already gets for free — confirmed in a real
375px pass that it correctly becomes one card per permission with no
extra code. Columns are `Permission | Enabled | Module | Description`,
**in that order deliberately, not the order first built**: a first pass
put `Enabled` last, and a real-browser check caught the table
overflowing its container (`scrollWidth` 936 vs `clientWidth` 758) —
`TableCell`'s default `whitespace-nowrap` (same root cause Epic 19's
Legend page hit) was letting every row's full prose description force
the table wider than the viewport, scrolling the actual toggle control
out of reach. Fixed by moving `Enabled` next to `Permission` (so the
control is reachable even if something else overflows) and giving only
the `Description` column `whitespace-normal` + a `min-w-56 max-w-sm`
clamp, so it wraps instead of stretching the table. `RolePermissionMatrix`
is `key`ed by `role.id` in the parent — its `selectedIds` state only
ever initializes from `role.permissionIds` on mount, so without the
remount-on-switch, picking a different role in the sidebar would keep
showing the previous role's in-progress (possibly dirty, unsaved) toggle
state against the new role's data.

**Sidebar: visual refresh + a collapse-to-icon-rail mode, not a
rewrite of its underlying nav-item data or active-route logic.** Added
a single accent element (a `FlameIcon` mark in a rounded `bg-primary`
badge next to the wordmark) as the one deliberate "premium" flourish,
and left the existing amber active-state treatment alone — already a
clean, standard pattern, not worth re-litigating alongside everything
else changing at once. New `src/components/shell/use-sidebar-collapsed.ts`
persists the collapsed/expanded choice in `localStorage` (same
hydration-safe `mounted`-after-effect pattern `ThemeSwitcher` already
uses, since the stored value isn't known during SSR) — confirmed via a
real reload that the choice survives. Collapsed width is `w-16` (a
standard icon-rail size); the toggle is a small circular button
half-overlapping the sidebar's own border (`absolute -right-3`,
needs `relative` on the `<aside>` — a `position: sticky` ancestor is a
valid containing block for an absolutely-positioned descendant, so this
works despite the sidebar itself being sticky), chosen over a
hover-to-reveal control for discoverability in a business app where
finding the toggle matters more than minimizing chrome.

**Nav labels are collapsed via width/opacity transition, not
conditional rendering — and a new `Tooltip` primitive stands in for
the hidden label.** The label text stays in the DOM and animates its
own box to `w-0 opacity-0` in step with the sidebar's width transition,
rather than disappearing abruptly; new `src/components/ui/tooltip.tsx`
(Radix `Tooltip`, matching this app's shadcn-style conventions, the
same way `switch.tsx` was added for the Roles round) only wraps a nav
item when `collapsed` is true — an expanded item already shows its
label inline, so a tooltip there would just be redundant chrome.
Confirmed working in a real hover test (collapsed, hovering the
Analytics icon shows an "Analytics" tooltip). The sidebar's own
width transition uses the `animate` skill's strong ease-in-out curve at
200ms (a resize reads as "morphing on screen," not entering/exiting)
with `motion-reduce:transition-none` on every animated piece — the
collapse, the toggle icon's rotation, and each label's own width/opacity
tween.

**Shell padding bumped in step, not in isolation** — the sidebar nav
items `px-2`→`px-3`/`py-1.5`→`py-2`, the brand row and account trigger
rows each gained a bit more vertical padding, `TopBar` went
`md:px-6 md:py-3` → `md:px-8 md:py-4`, and `main` went `md:p-6` →
`md:p-8` — chosen so `TopBar`'s title and the page content below it
keep sharing the same left gutter (`md:px-8` on both) rather than only
bumping one side and leaving them visually misaligned. Mobile
(`BottomNav`, the below-`md` shell) was left untouched — nothing in the
request named it, and the prior mobile-UX round already gave it its own
dedicated pass.

**A third, smaller follow-up the same day: "The theme switcher on the
avatar section should be a selector like in the public navbar."**
`AccountMenu`'s theme control used to be three full-width stacked
`DropdownMenuItem` rows (Light/Dark/System, each with icon + label +
a checkmark) under a "Theme" label — three rows of vertical space for
one setting. Replaced with a new `ThemeSelector`: a single row holding
a compact three-icon segmented control (the same Light/Dark/System set,
same icons), matching the public (pre-auth) pages' standalone
`ThemeSwitcher` in spirit — compact and icon-driven — without literally
nesting that component's own dropdown-trigger inside this already-open
one (a dropdown-inside-a-dropdown would fight the outer menu's own
focus/outside-click handling for no real benefit here). **Built from
plain `<button>`s, not `DropdownMenuItem`s, specifically so clicking a
theme option does not close the account menu** — every other row in
this menu closes it on select (standard Radix behavior), but closing on
a theme click would mean reopening the menu just to compare Light vs.
Dark, which this now avoids: confirmed in a real browser that clicking
"Dark" repaints the whole app immediately while the dropdown — and its
other rows (Take a tour, Sign out) — stay right where they were. Carries
the same hydration-safe `mounted` guard `ThemeSwitcher` already uses, so
the active segment doesn't highlight the wrong option for one frame
before the client's real saved theme is known.

**Verified with `pnpm lint`, `pnpm test`, `npx tsc --noEmit` (all clean)
and a Playwright pass signed in as `manager`**: both roles' matrices
render with the correct toggle state cross-checked against
`prisma/seed.ts`, the table no longer overflows its container at a
1280px viewport, collapsing/expanding the sidebar works and persists
across a reload, the collapsed-icon tooltip appears on hover, the
account menu's dropdown alignment switches to `center` when collapsed
so it doesn't open oddly off a narrow trigger, a 375px mobile pass
confirmed the dashboard and the Roles page (sidebar-as-horizontal-row +
DataTable's card view) are both unaffected by the desktop-only shell
changes, the new theme selector was exercised from both the desktop
sidebar trigger and the mobile `BottomNav` avatar trigger (switching
themes, confirming the menu stays open), and light/dark mode were both
checked throughout.

**Files touched:** `src/features/roles/components/role-manager.tsx`
(rewritten again); `src/components/shell/app-shell.tsx` (rewritten);
`src/components/shell/top-bar.tsx` (padding only);
`src/components/shell/account-menu.tsx` (theme section replaced); new
`src/components/shell/use-sidebar-collapsed.ts`,
`src/components/ui/tooltip.tsx`. No schema/API/dependency changes —
`Tooltip` came from the same already-installed `radix-ui` package
`Switch` did.

---

## 2026-11-10 — Plain-language Roles/Settings + app-wide toasts and error boundaries (outside the epic sequence)

**Built directly on request**: "The roles and setting pages are junky and
very technical change them to a proper pages for non-technical person.
Also let's integrate a roubust error handling modal and sonners." Two
related but separable pieces of work, both touching most of the app.

**Roles page: raw permission strings replaced with a plain-language
translation layer, not reworded in place.** New `src/features/roles/
permission-labels.ts` maps every `module.name`/`permission.name` this
app's RBAC actually uses (`"raw-material:record"`, `"stock:accept"`, …)
to a `{label, description}` a non-technical Manager can read, plus a
`DescribeModule`/`icon` pairing per module and a `HumanizeRoleName`
helper (`"INVENTORY_MANAGER"` → `"Inventory Manager"`). Both lookups
fall back to the raw name rather than throwing on a miss, so a newly
seeded permission/module shows unprettified instead of breaking the
page — a deliberate "degrade, don't crash" choice given this table is
hand-maintained and will drift from the seed over time. `role-manager.tsx`
was rewritten around this: permissions now render as toggle rows (label +
one-line description + a new `Switch` primitive) grouped under icon-
labeled module sections, replacing the old flat grid of raw `<input
type="checkbox">` elements with permission strings as labels — the
raw-checkbox markup was also the one place in this app not using any
`src/components/ui/*` primitive, so this incidentally fixed a visual
inconsistency too. Save/Reset-dirty-state logic is unchanged, just the
rendering around it.

**New `src/components/ui/switch.tsx`** — this app had no toggle-switch
primitive; built against Radix's `Switch` (already available through the
consolidated `radix-ui` package every other primitive here uses, so no
new dependency) matching the existing shadcn-style conventions.

**Settings: index page rebuilt as icon-fronted `Card` links** (new
`src/features/settings/` feature folder, `SettingsLinks` — split into
its own Client Component for the same reason `CreateProductTrigger`
exists: a Server Component page can't import `@phosphor-icons/react`
directly) replacing the old plain bordered `<div>` list. **Unit
conversions' core technical concept — a bare "ratio to KG" number — was
reframed, not just relabeled**: the field is now "Weight per unit (kg)"
with a live example that reads back the unit name as you type it ("How
many kilograms is one CARTON? If 1 CARTON weighs 12.5 kg, enter 12.5."),
and the table's own "Ratio to KG" column (previously a bare, unitless
number) now reads "13 kg" — a non-technical reader was never going to
intuit that a lone "13" in a column meant kilograms. Raw materials'
settings page was left alone — it has no equivalent "technical number"
concept, just a name + status, so there was nothing to translate.

**Sonner, wired at the mutation-hook level, not per-component.** New
`src/components/shell/toaster.tsx` (`<Toaster theme={resolvedTheme}
position="top-center" richColors closeButton />`, mounted once in the
root layout) plus `src/lib/get-error-message.ts` — a single
`GetErrorMessage(error, fallback)` that unwraps `CreateApiRoute`'s
`{error: string}` response shape (every API route in this app returns
this exact shape on every non-2xx response, see `rest.handler.ts`) via
`axios.isAxiosError`. Every `useMutation` across all 14 feature `hooks/
use-*.ts` files (~30 mutations) gained an `onSuccess` toast (a short
past-tense confirmation — "Category added", "Stock accepted", "New
price set") alongside its existing `queryClient.invalidateQueries` calls,
and an `onError` toast via `GetErrorMessage`. Centralizing this in the
hooks rather than each component's JSX means every call site of a given
mutation gets consistent feedback for free, and it's the only way to
reach a form that calls `mutateAsync` from inside a submit handler with
no local error-rendering of its own.

**Discovered mid-implementation: several forms were already throwing
away a more specific server error in favor of a hand-typed guess.**
`CreateUnitConversionForm`'s inline error text read "Couldn't create
unit — check the name isn't already in use" unconditionally, while the
server (`POST /api/v1/unit-conversions`) already returns the exact
reason, `"A unit with that name already exists"`, on a 409 — the
component was never reading `error.response.data.error`, just rendering
static text whenever `isError` was true. Same pattern in `category-
manager.tsx`, `material-manager.tsx`, `user-manager.tsx`, and others.
Fixed as a side effect of the toast rollout (the toast now shows the
real message), and the **20 now-redundant inline `{mutation.isError &&
<p className="text-destructive">…</p>}` blocks across 16 components were
deleted outright** rather than left to show a duplicate, less-accurate
message alongside the new toast — confirmed via `grep -rln
"\.isError &&" src/features/` that only `role-manager.tsx` still had one
afterward (removed separately, as part of that file's full rewrite).

**Error boundaries: two new `error.tsx` files, plus a latent bug fixed
in the pre-existing `global-error.tsx`.** `src/app/(dashboard)/error.tsx`
sits between `(dashboard)/layout.tsx` and whatever page crashes —
confirmed in a real browser (a deliberate throwaway `throw new Error()`
test page, created and deleted within the same session) that `AppShell`
(sidebar/TopBar/BottomNav) stays fully mounted and navigable while only
the main content area shows the fallback card, letting a crash on one
page be routed away from instead of stranding the user. `src/app/
error.tsx` covers everything outside `(dashboard)/` (landing, sign-in)
with the same styled card. Both use Next 16.3's `retry()` prop (confirmed
current for this app's Next 16.4.5 via `node_modules/next/dist/docs/
.../error.md`'s version table — `reset()` still exists but the docs
call `retry()` the preferred one as of this version) rather than the
older `reset()` convention a stale mental model would reach for.
**`global-error.tsx` (pre-existing, only reached if the root layout
itself throws) was silently unstyled** — per Next's own docs, this file
replaces `<html>/<body>` entirely and does not inherit `globals.css`,
fonts, or the theme class `ThemeProvider` sets, something the original
file never accounted for despite using Tailwind utility classes
throughout. Fixed by importing `globals.css` directly; it necessarily
stays permanently in light-mode token values since there's no
`ThemeProvider` at that layer to resolve a theme from.

**Verified with `pnpm lint`, `pnpm test`, `npx tsc --noEmit` (all clean)
and a Playwright pass signed in as `manager`**: both role cards render
with human-readable labels/descriptions/icons and correct per-role
toggle state (cross-checked against `prisma/seed.ts`'s actual
`INVENTORY_MANAGER_PERMISSIONS`), toggling and saving a permission fires
a real `"Permissions updated"` success toast and persists (confirmed via
a full page reload reading the saved state back from the server, not
just client cache) — **the test toggle was reverted and re-saved to
restore the original seeded permission set** before finishing, so dev
data wasn't left mutated; the settings index and unit-conversion pages
render the new copy/icons correctly; a real 409 conflict (adding a
duplicate unit name) produces an error toast showing the server's exact
message, not a hand-typed guess; the dashboard error boundary was
exercised with a real thrown error and confirmed the shell stays
interactive; light and dark mode both checked. One incidental
environment note: a background `pnpm dev` process from earlier in this
session referenced a stale, differently-pathed directory and logged a
spurious "directory deleted" warning on restart — investigated
immediately via `git status`/`git log`/file-content checks against the
actual project root and confirmed no project data was ever at risk; a
single throwaway verification file briefly written to a mistyped sibling
path was found and deleted, never part of the repo.

**Files touched:** new `src/features/roles/permission-labels.ts`;
`src/features/roles/components/role-manager.tsx` (rewritten); new
`src/components/ui/switch.tsx`; new `src/features/settings/components/
settings-links.tsx`; `src/app/(dashboard)/manager/settings/page.tsx`;
`src/features/unit-conversions/components/unit-conversion-manager.tsx`;
new `src/components/shell/toaster.tsx`, `src/lib/get-error-message.ts`;
`src/app/layout.tsx` (+`<Toaster />`); all 14 `src/features/*/hooks/
use-*.ts` files (+toast feedback); 16 components across categories,
customers, loans, products, raw-materials, sales, stock, unit-
conversions, and users (removed redundant inline error text); new
`src/app/(dashboard)/error.tsx`, `src/app/error.tsx`; `src/app/
global-error.tsx` (fixed missing `globals.css` import). `package.json`/
`pnpm-lock.yaml` (+`sonner@2.0.8`).

---

## 2026-11-09 — Mobile navbar/tabs resize fixes (outside the epic sequence)

**Built directly on request**: "the Navbar texts have bad UI and the
tabs(any horizontal overflowing component) should resize to screen size
or implement a horizontal scroll(I think the former is a better UX)."
Audited every horizontally-constrained mobile component rather than
guessing which ones qualified — `BottomNav` (the real offender: a
horizontally-*scrolling* 13-item row with no scroll affordance, so most
of Manager's nav was invisible and undiscoverable without knowing to
swipe), the shared `Tabs` primitive (`src/components/ui/tabs.tsx`, used
by `AnalyticsHub`'s 4 tabs), `product-detail.tsx`'s hand-rolled 4-tab
switcher (predates `Tabs`, explicitly left out of scope by Epic 17), and
`TopBar`'s title row. Confirmed with real 375px Playwright screenshots
before and after each fix, not just a code read — the two `Tabs`-based
switchers, it turned out, never actually overflowed the viewport (their
un-wrapped text just wrapped to 2 lines automatically), but did it
unevenly: single-line and wrapped two-line triggers sat at different
baselines with the active underline landing at a different height per
tab, which is the "bad UI" the user was pointing at even though it
wasn't literally `overflow`.

**`BottomNav` replaced its scrolling row with a fixed "N primary items +
More + Account" layout, all equal-width (`flex-1`), zero `overflow-x`.**
`PRIMARY_NAV_COUNT = 3`: a role with 4 or fewer nav items shows them all
directly (no "More" clutter for a case that doesn't need it); more than
that shows the first 3 plus a "More" trigger for the rest. Chosen over
shrinking every item to fit (truly fitting Manager's 13 items at 375px
would mean sub-20px icon-only targets, well under any reasonable
touch-target minimum) and over keeping the scroll with just an added
affordance (a fade/arrow hint still requires the user to notice and act
on it; a labeled, always-visible "More" needs no discovery at all — the
same reasoning any mobile app's bottom-tab-bar-plus-overflow pattern
already encodes). This is exactly the "fixed-4-items + 'More' sheet"
design the original `BottomNav` comment flagged as the better pattern
but deferred "since no Sheet/Drawer primitive exists yet" (see the
"mobile-responsive shell" decisions) — resolved here with the existing
`DropdownMenu` primitive instead of a new Sheet component: anchored
`side="top"` off the trigger exactly like `AccountMenu` already does
from the same bar, so no new primitive was actually needed. The "More"
trigger (`DotsThreeIcon`) picks up the active color when the current
route matches any overflowed item, so landing on an overflowed page
doesn't look like nothing in the bar is selected.

**Known, accepted tradeoff: a Epic 20 tour step targeting a nav item now
living under "More" on mobile loses its real anchor.** `data-tour`
anchors on the overflowed items only exist in the DOM while the Radix
`DropdownMenuContent` is actually open (same as every other
`DropdownMenu` in this app — closed content unmounts), so
`FindTourElement` can't find them and driver.js falls back to its own
built-in dummy-centered-popover behavior after `waitForElement` elapses.
Verified this is a *degradation*, not a break: stepped an actual tour
through to an overflowed nav step at 375px — the popover showed centered
with the right title/description, `Previous`/`Next` still worked, no
console error, no hang. Not worth solving by forcing the overflow menu's
content to stay mounted (Radix's `forceMount` would need hand-written
show/hide CSS to avoid an invisible-but-interactive menu sitting over
the page) for a cosmetic loss affecting only 3 (Inventory) or 10
(Manager) of a tour's steps, on mobile only, when every step still
narrates correctly.

**`TabsList`/`TabsTrigger` (`src/components/ui/tabs.tsx`) now resize
to fill the row below `md` (`flex w-full` + each trigger `flex-1`,
`md:inline-flex md:w-fit` / `md:flex-none` restores the original
hug-content desktop look exactly, unchanged) with every trigger given a
shared `min-h-10` and centered text** — this is what actually fixes the
uneven-baseline problem: 1-line and 2-line labels now report the same
height to the flex row regardless of which one wraps, so the whole
`TabsList` (and its active-tab underline) sits level. No font-size
change — 2-line wrapping for "Stock Health"/"Best Sellers" stays, just
evenly laid out now, which reads as an intentional compact mobile tab
bar rather than an overflow accident.

**`product-detail.tsx`'s hand-rolled 4-button tab switcher was migrated
onto the shared `Tabs` primitive** rather than hand-patched with the same
mobile fix a second time — it's a `useState<Tab>`-controlled set of
buttons with manual active-state classNames, functionally identical to
what `Tabs`' `value`/`onValueChange` controlled mode already does, and
fixing the alignment problem twice in two different implementations
(one now via the shared primitive, one by hand) would just reintroduce
the exact "two inconsistent Tabs implementations" gap Epic 17 explicitly
left open. Confirmed the migration preserves behavior: controlled `tab`
state unchanged, all four panels (`ProductOverview`/`PriceHistoryTab`/
`CostHistoryTab`/`RecipeEditor`) still render on selection, clicking
through tabs in a real browser session still worked end to end.

**`TopBar`'s "Welcome back, X" greeting is now `hidden` below `md`.**
It's `shrink-0` (by design, so it's never the one that truncates) sharing
one flex row with the page title/description (which *is* allowed to
truncate, `min-w-0`) — on a 375px screen the greeting was claiming a
fixed ~110px of a ~340px row before the title block even got to lay out,
so a merely-long description (e.g. Dashboard's "Sales trend, stock
levels, loan exposure, and low-stock alerts.") truncated far more
aggressively than its actual content required. The greeting is
decorative, not orientation-critical (the title already says where you
are); desktop keeps it since there's no width pressure there to justify
removing it.

**Files touched:** `src/components/shell/bottom-nav.tsx` (rewritten:
primary/overflow split, `DropdownMenu`-based "More"); `src/components/
shell/top-bar.tsx` (`hidden md:block` on the greeting); `src/components/
ui/tabs.tsx` (`TabsList`/`TabsTrigger` mobile-fill + consistent height);
`src/features/products/components/product-detail.tsx` (hand-rolled
switcher → shared `Tabs`). No schema/API/dependency changes. Verified
with `pnpm lint`, `pnpm test`, `npx tsc --noEmit` (all clean) and a
Playwright pass at 375px as both `manager` and `inventory`: `BottomNav`
shows 5 equal-width slots (no `overflow-x`) for both roles, "More" opens
upward and lists every remaining item with a working icon + label, its
own active-state highlighting confirmed by navigating to an overflowed
page (Legend) and back, `AnalyticsHub`'s 4 tabs and `product-detail`'s 4
tabs both render evenly aligned with no ragged baseline, 1280px desktop
re-checked afterward to confirm zero regression (hug-content tabs,
visible greeting, full sidebar, all pixel-identical to before), and the
Epic 20 tour's known mobile degradation (above) confirmed non-breaking
by actually stepping through it.

---

## 2026-11-09 — CSV/PDF report export (outside the epic sequence)

**Built directly on request, after Epic 20**: "add export report such as
analytics, stock, loan and sales to csv and pdf format. also add it for
other subject you deem needs it." Confirmed the one real architectural
fork with the user first — CSV needs no library (hand-rolled, trivial),
but PDF does — offering jsPDF+jspdf-autotable (new MIT dependency,
real downloadable `.pdf`) against a zero-dependency `window.print()`
fallback; user picked jsPDF+autotable.

**Scope — which "other subjects" got export, decided by inventorying
every `DataTable<T>` consumer in `src/features/**` rather than guessing:**
alongside the four named (Stock balances + per-product ledger, Materials
balances + per-material ledger — mirrors Stock exactly, Sales, Loan
oversight + per-customer ledger), added Products catalog, Customers list,
and all four Analytics tabs (Production's two tables, Profitability's
margin table, Stock Health's product table, Best Sellers' two rankings) —
13 export points total. **Deliberately left out:** Users, Roles,
Categories, Unit Conversions, and the Settings pages (administrative
config, not reporting subjects a Manager would hand to someone outside
the app) and the per-product Price/Cost history tabs (niche, granular;
revisit only if asked).

**One shared mechanism, not 13 bespoke exporters**: new `src/lib/export/`
(`ExportColumn<T>` — `{header, value: (row: T) => string | number}`,
`ToCsv`, `ToPdf`, `DownloadBlob`) plus a shared `src/components/ui/
export-menu.tsx` (`<ExportMenu columns rows filename title />`, a
`DropdownMenu`-based "Export" button offering CSV/PDF, built on the same
`Button`/`DropdownMenu` primitives every other dropdown in this app uses —
no bespoke styling needed, themes automatically). **`ExportColumn<T>` is
intentionally a separate type from `DataTableColumn<T>`** (`data-table.tsx`,
whose `cell` returns a React node for on-screen rendering — links, badges,
`<TrendIndicator>`) rather than extending it with an optional export hook:
most columns' `value` is trivially the same primitive their `cell` already
renders, but the handful that render JSX (Stock Health's `StatusBadge`,
Best Sellers' `TrendIndicator`) need a genuinely different plain-text
rule, and forcing every one of this app's 10+ other `DataTableColumn`
consumers to grow an unused `exportValue` field for three call sites that
need it wasn't worth the coupling.

**Export always fetches the full result set, not the current page** —
paginated lists (Stock, Materials, Sales, Loans, Products, Customers) pass
`ExportMenu` a lazy `() => Promise<T[]>` that calls the feature's own
service function directly (bypassing the `use*` hook, which can't be
invoked conditionally on click) with `{ pageSize: MAX_PAGE_SIZE }` —
reusing the exact same "need everything, not a page" pattern the pagination
work already established for dropdown pickers (see this file's "Backend +
frontend pagination decisions" entry), not a new unbounded-fetch endpoint.
**Same known limit applies and isn't solved here either**: a resource with
more than 100 active rows would silently export only the first 100 —
acceptable for this app's current scale, flagged rather than engineered
around, consistent with the precedent. Analytics tabs need no lazy fetch
at all — Epic 17 already loads each tab's full, unpaginated array up
front, so `ExportMenu` there gets the already-rendered array directly
(`rows={data.materials}`, `rows={sortedProducts}`, etc.) — exporting
exactly what's on screen, including any client-side sort/filter/search
already applied (Profitability's sort, Stock Health's filter+search,
Customers' server-side search term).

**CSV**: RFC 4180 quoting (quote only cells containing a comma/quote/
newline, not unconditionally), CRLF line endings, and a leading UTF-8 BOM
specifically so Excel — still the most common opener for a downloaded
`.csv` — auto-detects UTF-8 instead of guessing a local 8-bit codepage and
mangling anything non-ASCII. No library; this is a ~15-line string-join
function, well under the bar for adding a dependency.

**PDF**: one `jsPDF` instance per export, a title + "Generated <timestamp>"
line, then `jspdf-autotable` for the actual table (striped alternate rows,
a header row filled with the same amber hex already validated as
Epic 17's dark-mode `--chart-series-1` token — a PDF page has no
light/dark concept of its own, so the token's *value* is reused directly,
not the CSS variable). Confirmed both packages' license/maintenance via
`npm view` before installing (both MIT; jsPDF last published ~8 months
ago, autotable within the last month) — same spike discipline as Epic 20's
driver.js check, done here without a separate user-facing write-up since
the user had already picked this option explicitly.

**`pnpm install` started failing after adding jsPDF** (`ERR_PNPM_IGNORED_BUILDS`
blocking `core-js`'s postinstall, a new transitive dependency pulled in by
the install) — read `core-js`'s actual `postinstall.js` before approving
anything: it only prints a one-time sponsorship banner to the console
(rate-limited via a tmpdir file), no other side effect. Approved via
`pnpm-workspace.yaml`'s existing `allowBuilds` map (`core-js: true`),
same mechanism already used there for `@prisma/engines`/`bcrypt`/`prisma`.

**Files touched:** new `src/lib/export/{export-column,to-csv,to-pdf,
download-blob}.ts`; new `src/components/ui/export-menu.tsx`;
`src/features/stock/components/{stock-balance-list,stock-ledger}.tsx`;
`src/features/raw-materials/components/{material-balance-list,
material-ledger}.tsx`; `src/features/sales/components/sale-list.tsx`;
`src/features/loans/components/{loan-oversight-list,loan-ledger}.tsx`;
`src/features/products/components/product-list.tsx`;
`src/features/customers/components/customer-list.tsx`;
`src/features/analytics/components/{production-tab,profitability-tab,
stock-health-tab,best-sellers-tab}.tsx`; `package.json`/`pnpm-lock.yaml`
(+`jspdf@4.2.1`, +`jspdf-autotable@5.0.9`); `pnpm-workspace.yaml`
(`core-js: true`). Verified with `pnpm lint`, `pnpm test`, `npx tsc
--noEmit` (all clean) and a Playwright pass signed in as `manager`:
clicked "Export as CSV" on Stock balances and inspected the actual
downloaded file byte-for-byte (UTF-8 BOM present, CRLF endings, correct
quoting on a comma-containing date cell, all 4 rows present); clicked
"Export as PDF" on the same list and parsed the downloaded file (valid
`%PDF-1.3`, correct title/timestamp/every row's text extracted); exported
Production's "Raw materials" table (the already-loaded-array path, no
service call) and confirmed its CSV matched exactly what was on screen;
confirmed the Export button/dropdown themes correctly in dark mode with
no custom CSS (it's built entirely from existing `Button`/`DropdownMenu`
primitives).

---

## 2026-11-09 — Epic 20 (Interactive Product Tutorial) decisions

**Research spike outcome: driver.js, confirming (not just accepting) the
epic doc's lean.** Checked `npm view driver.js license version time` live
rather than trusting the doc's write-up: MIT license, version 1.11.0
published the day before this session (2026-11-08), with releases roughly
every 1-2 weeks through October-November 2026 — actively maintained, no
licensing question mark (unlike intro.js's AGPL/commercial split), no React
coupling to fight (unlike reactour), no Bootstrap-flavored default CSS to
undo (unlike shepherd.js). Got explicit user sign-off on the library choice
before installing, per the epic doc's instruction. Installed pinned to
`1.11.0` (`pnpm add driver.js@1.11.0` — pnpm's default resolution picked a
stale cached `1.10.2` otherwise).

**One shared tour-engine hook (`useProductTour`), two role-scoped step-list
arrays (`MANAGER_TOUR_STEPS`/`INVENTORY_TOUR_STEPS`), as the epic doc
specified — the one non-obvious implementation problem it left unsolved is
cross-page navigation mid-tour.** driver.js drives one static DOM at a
time; this tour's own target elements don't all live on one page (the
epic doc explicitly calls out `InventorySalesView`'s "Record sale" and
`InventoryStockView`'s "Accept stock" buttons, each page-specific). Each
step definition (`tour-steps.ts`) carries an optional `route`; the engine
(`use-product-tour.ts`) overrides every step's `popover.onNextClick`/
`onPrevClick` (driver.js routes arrow-key navigation through these too, not
just the footer buttons) to call Next's `router.push(nextStep.route)`
*before* calling `driver.moveNext()`/`movePrevious()` when the target
step's route differs from the current pathname, then lets driver.js's own
`waitForElement` + `MutationObserver` machinery (already built for "this
element hasn't mounted yet") do the actual waiting — no polling or custom
wait loop needed. Verified in a real browser: Manager's tour navigates
`/manager/dashboard` → `/manager/products` for "New product", Inventory's
navigates `/inventory/dashboard` → `/inventory/stock` → `/inventory/sales`
for "Accept stock"/"Record sale" respectively, both directions (Next and
Previous).

**Nav items render twice at once (desktop `AppShell` sidebar +
mobile `BottomNav`), both tagged with the same `data-tour` id for a given
href** (`NavTourId(href)`, derived from `nav-config.ts`'s own hrefs so
there's one source of truth, not two hand-typed id lists) — `FindTourElement`
picks whichever of the two matching elements is actually rendered.
**First attempt at "actually rendered" was wrong and only caught in
browser verification at a 375px viewport**: checking the element's own
`getComputedStyle().display !== "none"` is not enough, because AppShell's
desktop-only wrapper hides via `hidden md:flex` on the ancestor `<aside>`,
not on the `<Link>` itself — the link's own computed `display` is still
`flex` from its own class list regardless of the ancestor. driver.js
correctly received the desktop (hidden, zero-size) element on mobile and
highlighted nothing. Fixed by switching to `element.getClientRects().length
> 0`, which reflects the full rendering pipeline (any hidden ancestor, not
just the element's own `display`) and — unlike the classic `offsetParent
!== null` trick — isn't broken by `BottomNav` being `position: fixed`.
Re-verified at 375px after the fix: the tour correctly spotlights
`BottomNav`'s tab, not the invisible sidebar link.

**`ROLES` moved out of `src/lib/redirector.ts` into its own
`src/lib/roles.ts`, re-exported from `redirector.ts` for its existing
importers.** `useProductTour` needs the plain `{MANAGER, INVENTORY_MANAGER}`
string-constant object to pick a step list by `user.role`, but
`redirector.ts` is a server-only module (it also exports `RoleRedirector`,
which calls `GetSession` → `next/headers`) — importing `ROLES` from it in a
`"use client"` file still pulls `next/headers` into the client/SSR bundle
through that file's top-level imports, even though the constant itself has
no server dependency. This broke `(dashboard)/layout.tsx` with a hard 500
("You're importing a module that depends on 'next/headers'... in the Pages
Router") the first time the tour code was wired into `AccountMenu`, caught
immediately by a Playwright pass, not shipped. No other importer of `ROLES`
(`prisma/seed.ts`, the three server layouts) needed to change.

**Theming: driver.js's popover restyled against this app's own
border/background/foreground/ring tokens in a dedicated
`src/components/tour/tour-theme.css`, imported directly after
`driver.js/dist/driver.css` inside `use-product-tour.ts`** (not added to
`globals.css`) — both per the epic's explicit "Feature folder" instruction
("Holds... any theming/CSS override needed") and because same-module
sequential CSS imports have a bundler-guaranteed order that a root-loaded
`globals.css` vs. a leaf-client-component's lazily-loaded package CSS does
not. Several of the override rules depend on that guarantee: they win a
same-specificity cascade tie against driver.css's own rules by loading
later, not via a selector-specificity trick. The one rule that needed
special handling rather than a blanket override: driver.js's popover arrow
is a single `<div>` whose *default* `border: 5px solid #fff` paints all
four sides, with four side-specific classes (`.driver-popover-arrow-side-
{top,right,bottom,left}`) each zeroing three of the four sides to
transparent, leaving the fourth (the visible, pointing side) at the base
rule's color. Recoloring the base rule itself (or using any selector with
equal-or-higher specificity than the side classes) would also re-color the
three sides meant to stay transparent, turning the arrow into a solid
square — so each side's color is set individually, scoped to the matching
side-specific class, touching only that one side's `border-*-color`.
Entrance easing is the same strong ease-out `cubic-bezier(0.23, 1, 0.32,
1)` Epic 16 uses for its route-change crossfade, applied via `animation-
timing-function` on `.driver-fade .driver-popover` (driver.css's own rule
omits a timing-function, defaulting to the weaker browser `ease`).

**Reduced motion: checked once via `matchMedia` at tour-launch time (not a
mounted `useReducedMotion()` hook) and passed straight into driver.js's own
`animate`/`smoothScroll` config flags, fully disabling both the stage-move
tween and the popover fade rather than a partial "keep the fade, drop the
move" split.** The tour is user-triggered by a click, not rendered
reactively, so there's no SSR-mismatch window to guard against the way the
mounted hook exists for chart entrances. driver.js's `animate` boolean
gates both effects together with no finer-grained config knob exposed (confirmed
by reading `node_modules/driver.js/dist/driver.js.mjs` directly, not just
its `.d.ts`) — accepted as the closest achievable match to "fewer and
gentler, not zero" without patching the library: the mechanical tween is
removed, the actual information (new popover text at the new highlighted
element) still updates immediately, just without animation. Verified via
Playwright's `browser_emulate_media({reducedMotion: 'reduce'})`: `document.
body` gets driver.js's `driver-simple` class, not `driver-fade`.

**No "mark as seen" persistence, as the epic doc leaned** — not revisited;
nothing in this session's verification suggested the lean was wrong.

**Files touched:** new `src/components/tour/{tour-elements.ts,
tour-steps.ts, tour-theme.css, use-product-tour.ts}`; new `src/lib/roles.ts`;
`src/lib/redirector.ts` (now imports+re-exports `ROLES` from `roles.ts`
instead of defining it); `src/components/shell/account-menu.tsx` (+"Take a
tour" item); `src/components/shell/{app-shell.tsx, bottom-nav.tsx,
top-bar.tsx}` (+`data-tour` anchors on nav links, the account-menu trigger,
and the `TopBar` header); `src/features/sales/components/
inventory-sales-view.tsx`, `src/features/stock/components/
inventory-stock-view.tsx`, `src/features/products/components/
create-product-trigger.tsx` (+`data-tour` on each action button);
`package.json`/`pnpm-lock.yaml` (+`driver.js@1.11.0`). Verified with `pnpm
lint`, `pnpm test`, `npx tsc --noEmit` (all clean) and a Playwright pass
against the real dev server as both `manager` and `inventory`: the tour
launches from the account menu for both roles, all 16 (Manager) / 10
(Inventory) steps highlight the correct real element in the correct
role-scoped order including both cross-page action-button steps in both
directions, Previous/Next/keyboard-equivalent navigation, light and dark
mode (including the arrow-color fix), a 375px mobile viewport (confirming
the `BottomNav`-vs-`AppShell` visibility fix), and `prefers-reduced-motion`
correctly dropping to driver.js's non-animated mode.

---

## 2026-11-09 — Epic 19 (Legend & Walkthrough Reference Page) decisions

Implemented exactly as specced — the epic doc already pinned down the route
shape (`/legend`, a sibling of `manager/`/`inventory/`, inheriting only the
shared `(dashboard)/layout.tsx`'s plain signed-in check), the permission gate
(none), and nav placement (a top-level item in both `MANAGER_NAV_ITEMS` and
`INVENTORY_NAV_ITEMS`), so no routing/permission call was left to make.

**`legend/page.tsx` does not set `export const instant = false;`.** The
epic doc's own text reads as slightly ambiguous on this ("still applies...
unless it wants `session.user.role`..."), but AGENTS.md's actual rule is
narrower: only a page/layout whose **own body** calls `GetSession`/
`GetApiSession`/`CheckPermission`/`CheckAnyPermission` needs the flag itself.
`legend/page.tsx` reads no session at all (it renders unconditionally,
identically for both roles) — the shared `(dashboard)/layout.tsx` already
carries `instant = false` for the session read it does on every route's
behalf. This is the first page in the app with no page-level permission
check of its own, so there was no existing precedent to copy; every other
`page.tsx` under `(dashboard)/` calls `CheckPermission` and therefore carries
the flag.

**Content is a mix of a small TOC data array (`src/features/legend/
legend-sections.ts`) and plain JSX (`src/features/legend/components/
legend-content.tsx`)** — matches the epic doc's "a sectioned data array or
plain JSX" framing; a full data-driven renderer wasn't warranted for 7
fixed, differently-shaped sections (tables, badges, status cards, a
two-column role comparison) that are each written once and never iterated
generically.

**The "Daily Stock Report columns" and "Ledger entry types" sections use a
plain flex-row definition-list layout, not the shared `src/components/ui/
table.tsx` primitive**, discovered during browser verification: `Table`'s
auto table-layout sizes each column to its widest cell's *unwrapped*
preferred width, and with the `overflow-x-auto` wrapper that primitive uses
for scrollable data tables, a long prose "meaning" cell (the Closing Stock
row, mentioning both `StockBalance` and `RawMaterialBalance`) rendered as
one long line that ran off the card's right edge instead of wrapping —
invisible until an actual Playwright screenshot caught it (the accessibility
snapshot alone didn't show it). `Table` is correctly built for the compact,
genuinely-tabular data it's used for everywhere else in this app; this
page's content is closer to a glossary than a data grid, so a reusable local
`DefinitionRow` (term + wrapping description, `flex-col` on mobile/
`flex-row` on `sm+`) replaced both tables rather than patching `Table`
itself or this one page's content to avoid the primitive's auto-layout
behavior.

**Stock Health's 5 status rows duplicate `STATUS_META`'s icon/label/color
mapping from `stock-health-tab.tsx` locally rather than importing it** — this
app's feature-folder convention keeps features independent (`src/features/
legend/` importing from `src/features/analytics/` would cross that
boundary), and it's five display rows, not logic worth sharing. The
threshold prose (50%/100%/300% of `Product.lowStockThresholdKg`) is copied
from the real `STOCK_HEALTH_CRITICAL_RATIO`/`STOCK_HEALTH_OVERSTOCKED_RATIO`
constants in `src/app/api/graphql/route.ts`, not re-derived, so it can't
silently drift from the actual bucketing logic.

**Files touched:** new `src/features/legend/{legend-sections.ts,
components/legend-content.tsx}`; new `src/app/(dashboard)/legend/page.tsx`;
`src/components/shell/nav-config.ts` (+Legend in both nav arrays, new
`BookOpenIcon` import). Verified with `pnpm lint`, `pnpm test`, `npx tsc
--noEmit` (all clean) and a Playwright pass against the real dev server as
both `manager` and `inventory`: the nav item appears in the correct
position for each role's nav array, `TopBar` shows "Legend" as the title
with the page's description as its subtitle and no permission redirect for
either role, all 7 sections and the anchor-link TOC render correctly, no
console errors, light and dark mode, and a 375px mobile viewport (bottom
nav + full-width stacked content). The table-overflow bug above was caught
and fixed during this same verification pass, not left for a later session.

---

## 2026-11-09 — Epic 18 (Page Header Consolidation) decisions

**`usePageTitle`/`page-title-store.ts` replaced outright with
`usePageHeader`/`page-header-store.ts`** (new `description: string | null`
field alongside `title`, same mount/unmount-clear semantics) — a straight
rename+extend, not a back-compat shim, per this repo's "change the code,
don't alias it" convention. New `src/components/shell/page-header.tsx`
exports `<PageHeader title? description? />`, a `"use client"` leaf that
just calls the hook and renders `null` — exists purely so the many
**Server Component** `page.tsx` files (which can't call hooks directly)
can set `TopBar`'s description declaratively, in the exact spot their old
inline `<h1>/<p>` block used to sit, without being converted into Client
Components themselves. `TopBar` renders the description as a truncated
second line under the title.

**Removed all 19 redundant inline headings found by the planned
`grep -rn "text-lg font-semibold" "src/app/(dashboard)"` audit**: 16 flat
list-page `page.tsx` files had their own `<h1>{label}</h1><p>{description}</p>`
duplicating the nav-derived `TopBar` title — each now renders
`<PageHeader description="..." />` instead, carrying the same description
text forward. 3 generic entity-wrapper `<h1>`s (`manager/products/[id]/page.tsx`
→ `"Product"`, `manager/customers/[id]/page.tsx` and
`inventory/customers/[id]/page.tsx` → `"Customer"`) were dropped outright
rather than kept as section labels — confirmed first that the child
Client Component each page renders (`ProductDetail`, `CustomerProfile`,
`CustomerLedgerView` — the latter two both via `CustomerHeader`) already
sets the entity's own name as the `TopBar` title, so the generic label
added nothing. Note these three lived in the page wrapper, not in
`product-detail.tsx`/`ProductOverview` itself, which already had no such
heading.

**`product-stock-detail.tsx` and `material-detail.tsx` folded their own
in-component `<h1>{name}</h1><p>Current balance: {x} kg</p>` into a single
`usePageHeader({ title, description })` call** (title carries the
entity name + SKU for the stock case, description carries the balance
line) — same pattern `unit-conversion-manager.tsx`/`material-manager.tsx`
now follow for their two settings pages, which previously set the *same*
title twice (once via their own `usePageTitle("...")` call, once via
their `page.tsx` wrapper's independent inline heading) — now only the
feature component's `usePageHeader` call remains, carrying title +
description together, and the wrapper page just renders the bare
component.

**Verified** with `pnpm lint`, `pnpm test`, `npx tsc --noEmit` (all clean)
and a Playwright pass as both `manager` and `inventory` against the real
dev server: every converted list page, the product/stock/material/customer
detail pages, and the two settings pages render their title+description
correctly with no leftover inline heading; a 375px mobile viewport check
(`manager/settings/units`, `manager/dashboard`) confirmed the new
three-line mobile header (brand / title / description) truncates cleanly
with no overlap or crowding against the page content below.

**Files touched:** new `src/components/shell/{page-header-store.ts,
use-page-header.ts, page-header.tsx}`; deleted `src/components/shell/
{page-title-store.ts, use-page-title.ts}`; `src/components/shell/top-bar.tsx`;
`src/features/{products/components/product-detail.tsx,
stock/components/product-stock-detail.tsx,
raw-materials/components/{material-detail.tsx, material-manager.tsx},
customers/components/customer-header.tsx,
unit-conversions/components/unit-conversion-manager.tsx}`; 16 flat
`page.tsx` files under `src/app/(dashboard)/{manager,inventory}/**`; 3
`[id]/page.tsx` detail-page wrappers (`manager/products/[id]`,
`manager/customers/[id]`, `inventory/customers/[id]`);
`src/app/(dashboard)/manager/settings/{units,materials}/page.tsx`
(inline heading removed entirely, now just render their feature
component).

---

## 2026-11-08 — Top bar, bigger components, and password visibility (outside the epic sequence)

**Built directly on request, after the modal-folding round above**: a persistent top bar (page name + a welcome greeting, structured to host breadcrumbs later), a general sizing bump across the shared UI primitives ("font, cards and components... hard for the eye"), and a password show/hide toggle. The third ask ("this includes when the manager creates new user and updates passwords") named flows that didn't exist yet — confirmed scope with the user first (one question) rather than guessing, since the only options were (a) wire the toggle into sign-in only, (b) also add self-service change-password, or (c) reverse Epic 7's "auto-generated temp password, never manager-typed" decision and let a Manager set passwords directly. User chose (c).

**TopBar derives its title from whichever nav item matches the current pathname (same `pathname === item.href || pathname.startsWith(item.href + "/")` logic `AppShell`/`BottomNav` already use for active-nav highlighting), overridable per-page via a new `usePageTitle(title)` hook.** Chose a tiny Zustand store (`page-title-store.ts` — first use of Zustand in this app, already a listed dependency) over React Context: the title is read by one consumer (`TopBar`, mounted once in `AppShell`) but set by many independent page components scattered across feature folders, which Context can't do without wrapping every route in its own provider boundary. `usePageTitle` sets on mount/when its argument changes and clears back to `null` on unmount, so an override never leaks into the next page navigated to. Wired into the four dynamic detail pages where the nav-derived fallback was generic (`product-detail.tsx`, `product-stock-detail.tsx`, `material-detail.tsx`, `customer-header.tsx` — each now shows the entity's own name) plus the two Settings sub-pages (`unit-conversion-manager.tsx`, `material-manager.tsx`, both under the shared "Settings" nav match otherwise). Every other page relies on the nav-derived default — no per-page wiring needed for the ~16 top-level routes.

**Removed `MobileHeader` entirely rather than stacking it above the new `TopBar`.** First pass kept both (brand wordmark bar + title/welcome bar), verified via a 375px screenshot, and it was visibly too much vertical real estate for mobile with nothing `MobileHeader` added that `TopBar` didn't already cover. `TopBar` now carries the "Adika Candle" brand mark itself, in a `md:hidden` line above the title — mobile gets one bar instead of two; desktop is unaffected since the sidebar already shows the brand there. `mobile-header.tsx` deleted; the one other reference to it (a comment in `public-navbar.tsx`, an unrelated pre-auth header) was updated to say `TopBar` instead.

**Sizing bump is entirely at the shared `src/components/ui/*.tsx` primitive level, not a root `html` font-size multiplier and not a per-page sweep.** The whole design system (Epic 9's `radix-lyra` shadcn style) defaults to `text-xs` (12px) as its base body/control text with `text-sm` reserved for titles — objectively small for sustained reading, which is what "hard for the eye" was pointing at. Bumped `text-xs` → `text-sm` and `text-sm` (titles) → `text-base` across `card.tsx`, `button.tsx`, `input.tsx`, `select.tsx`, `table.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `label.tsx`, `dropdown-menu.tsx`, `pagination.tsx`, plus one control-height step up everywhere a height scale exists (`button.tsx`'s `xs/sm/default/lg/icon-*` variants, `input.tsx`, `select.tsx`'s `default/sm` sizes, `table.tsx`'s `TableHead`/`TableCell`) and `Card`'s `--card-spacing` token up one step. A root-level font-size bump was considered and rejected — on top of a 16.7% `text-xs`→`text-sm` jump already compounding through every primitive, it risked overshooting "a little bigger" into a full redesign. **Deliberately left small:** `badge.tsx` (status pills are glanced at, not read continuously, and bumping their text would look odd relative to their compact pill shape), `button.tsx`'s `xs` size variant (the one size explicitly meant to stay the smallest option), `table.tsx`'s `TableCaption`, and `avatar.tsx`'s initials text (decorative, inside an unbumped circle). `TableSkeleton`/`DetailSkeleton`'s placeholder block heights (`h-4` etc.) were also left as-is — a loading-state shimmer block being very slightly shorter than the now-slightly-taller real content isn't the "hard to read" problem this was fixing, and it's a transient state.

**Password-setting (`SetUserPassword`, `src/lib/set-user-password.ts`) is reimplemented against `auth.$context` directly, not better-auth's `admin` plugin, even though the plugin ships a ready-made `setUserPassword` endpoint that does exactly this.** Read that endpoint's own source (`node_modules/better-auth/dist/plugins/admin/routes.mjs`) to confirm what it actually does — `ctx.context.password.hash()` then `internalAdapter.updatePassword()` (or `createAccount()` if no credential account exists yet) — and replicated exactly that against `(await auth.$context)`, which exposes the same `password`/`internalAdapter` primitives without requiring the plugin. The reason to avoid the plugin itself: its `databaseHooks.user.create.before` hook unconditionally writes a plain `role: string` field onto every created `User`, which collides with this app's own `Role`/`Permission`/`Module` RBAC tables (`User.roleId` is a relation, not a plain string column) — enabling the plugin risked either a write error against an unexpected field or, worse, a second competing notion of "role" alongside this app's existing one. `auth.$context` is a documented, typed public surface (`Auth<Options>["$context"]`), not a private internal reached into — this isn't hack ing around better-auth, just using a lower-level piece of its own public API instead of the higher-level plugin bundle built on top of it.

**`CreateUserInputSchema` gained a required `password` field (bounds `.min(8).max(128)`, matching better-auth's own `emailAndPassword` defaults so this schema never accepts something `signUpEmail` would then reject) and `CreateUserResponseSchema` was removed entirely — `POST /api/v1/users` now just returns `UserSchema` like every other create endpoint.** The temporary-password-generation path (`generate-temporary-password.service.ts`) and the "shown once, dismissible" banner `Card` on `/manager/users` are both deleted outright, not kept behind a flag — there's no longer a server-generated secret to display. New `PATCH /api/v1/users/[id]/password` (separate from the existing `PATCH /api/v1/users/[id]`, which only ever touched `roleId`/`isActive`) backs a new "Set password" action in `UserRow`'s dropdown menu (a third nested `Dialog`, alongside the existing Edit `Dialog` and Deactivate `AlertDialog` — same "siblings-of-children around one `DropdownMenu`" pattern Epic 13 established, just one layer deeper). No self-lockout guard was added there — unlike `isActive`/`roleId`, a Manager changing their own password can't lock anyone out, and the row's action-menu trigger is already disabled entirely for the signed-in user's own row for unrelated reasons (Epic 7), so self-service password change isn't reachable through this UI regardless — consistent with the user's chosen scope (manager sets *other* users' passwords, not a self-service flow).

**New `src/components/ui/password-input.tsx`** wraps `Input` with a trailing icon `Button` (`EyeIcon`/`EyeSlashIcon`) toggling the underlying `type` between `password`/`text` — `tabIndex={-1}` so it doesn't steal tab order from the field itself, `aria-pressed` reflecting visibility state. One component, three call sites (`sign-in-form.tsx`, `CreateUserForm`, the new `SetPasswordForm`) — no per-field reimplementation.

**Files touched:** new `src/components/ui/password-input.tsx`; `src/lib/set-user-password.ts`; new `src/app/api/v1/users/[id]/password/route.ts`; `src/app/api/v1/users/route.ts`, `src/features/users/{validators/user.schema,services/user.service,hooks/use-users,components/user-manager}.ts(x)`; deleted `src/features/users/services/generate-temporary-password.service.ts`; `src/features/auth/components/sign-in-form.tsx`; new `src/components/shell/{page-title-store,use-page-title,top-bar}.ts(x)`; `src/components/shell/app-shell.tsx`, `public-navbar.tsx`; deleted `src/components/shell/mobile-header.tsx`; `src/features/products/components/product-detail.tsx`, `src/features/stock/components/product-stock-detail.tsx`, `src/features/raw-materials/components/{material-detail,material-manager}.tsx`, `src/features/customers/components/customer-header.tsx`, `src/features/unit-conversions/components/unit-conversion-manager.tsx` (`usePageTitle` wiring); `src/components/ui/{card,button,input,select,table,dialog,alert-dialog,label,dropdown-menu,pagination}.tsx` (sizing). Verified with `pnpm lint`, `pnpm test`, `npx tsc --noEmit` (all clean) and a Playwright pass: the sign-in password toggle actually reveals/hides the typed value; `Set password` on an existing user was exercised for real — set the Inventory dev user's password to a new value, signed out, signed back in **with the new password** (the one correctness check that actually matters here, since a mutation that returns 200 without erroring says nothing about whether better-auth can still verify the hash it wrote), then reset it back to the documented dev default (`ChangeMe123!`) so the seeded credentials in `AGENTS.md`/`seed.ts` stay accurate; `Create user` was exercised end-to-end with a manager-typed password and no leftover banner; `TopBar`'s nav-derived default and per-page override were both confirmed (dashboard/list pages show the nav label, a product detail page shows the product's own name); light/dark and a 375px mobile viewport (merged single header bar) all checked.

---

## 2026-11-08 — Record Sale / Accept Stock / New product folded into modals (outside the epic sequence)

**Built directly on request, after Epics 14–17**: "Sale and record a sale
should be one page... record a sale should be a modal... every page you
created that could have been a modal should be a modal." Confirmed scope
with the user first (one question) since none of the pages created in
Epics 14–17 themselves were standalone create-pages (`InventoryMaterialsView`
already used a modal) — the pattern the user was flagging predates this
session: `/inventory/sales/new` (Record Sale), `/inventory/stock/accept`
(Accept Stock), and `/manager/products/new` (New product) all pre-date
Epic 13's modal/action-menu convention and were never retrofitted to it.
User confirmed converting all three, not just Sales.

**Each pair collapsed into the existing list page, with the create form as
a `Dialog` triggered by a button** — same shape as `InventoryMaterialsView`
(Epic 14): `RecordSaleForm`/`AcceptStockForm`/`CreateProductForm` all lost
their own `Card`/`CardContent` wrapper (now supplied by `DialogContent`,
per Epic 13's established pattern) and their `router.push` success
handling, replaced with an `onSuccess: () => void` prop the composing
view's `onOpenChange` is passed as. New `src/features/sales/components/
inventory-sales-view.tsx` and `src/features/stock/components/
inventory-stock-view.tsx` (each: a "Record sale"/"Accept stock" button +
`Dialog` + the list) replace the old two-page split for `/inventory/sales`
and `/inventory/stock`; `src/features/products/components/
create-product-trigger.tsx` replaces `new-product-link.tsx` as the
Client-Component-wrapped (Phosphor icon, per Epic 9's Server-Component
constraint) trigger on `/manager/products`.

**`CreateProductForm` is the one exception that still calls `router.push`**
— after creating a product, it both calls `onSuccess()` (closing the
modal) and navigates to the new product's detail page, preserving the
pre-existing "set a price once the product is created" follow-up flow
(the page itself says as much). `RecordSaleForm`/`AcceptStockForm` only
call `onSuccess()` and stay on the list page, since neither sale nor
stock-acceptance has a natural follow-up detail page to land on.

**Removed nav items, not redirects:** `INVENTORY_NAV_ITEMS` dropped
"Record Sale" (`/inventory/sales/new`) and "Accept Stock"
(`/inventory/stock/accept`) entirely — both routes (and the now-unused
`new-product-link.tsx`) were deleted outright rather than kept as
redirects to the merged pages, since nothing else in the app links to
them (confirmed by grep before deleting) and they were never public URLs
a user could have bookmarked outside this app's own nav.

**Files touched:** `src/features/sales/components/{record-sale-form,
inventory-sales-view}.tsx`; `src/features/stock/components/
{accept-stock-form,inventory-stock-view}.tsx`; `src/features/products/
components/{create-product-form,create-product-trigger}.tsx` (new file,
replacing deleted `new-product-link.tsx`); `src/app/(dashboard)/
inventory/{sales,stock}/page.tsx`, `manager/products/page.tsx`;
`src/components/shell/nav-config.ts`; deleted `inventory/sales/new/`,
`inventory/stock/accept/`, `manager/products/new/`. Verified with `pnpm
lint`, `pnpm test`, `npx tsc --noEmit` (all clean — `.next` was cleared
and route types regenerated since Next's dev-mode route-type validator
had cached the deleted routes) and a Playwright pass: recorded a real
sale and accepted real stock through their new modals as `inventory`
(list refreshed, modal closed, no page navigation), created a real
product through its new modal as `manager` (modal closed, navigated to
the new product's detail page exactly as before).

---

## 2026-11-08 — Epic 17 (Analytics Hub) decisions

**Charting approach: continued hand-building (no new charting dependency),
reversing the "introduce a library" option the epic doc's Open Questions
flagged as live.** The deciding factor wasn't code volume but Epic 16's own
hard requirement ("every chart must use Epic 16's entrance animation on
initial render... not optional") — that requirement is trivial to satisfy
for a component this app fully controls (reuse the same `useChartEntrance`
hook every other chart already uses) and would instead mean fighting a
third-party library's own animation lifecycle to bolt the shared hook onto
it. Two new hand-built primitives in `src/features/analytics/components/`:
`TrendLineChart` (SVG `<path>` line chart, up to 2 series, legend only at
2+ per the dataviz skill's "single series needs no legend" rule, hover
crosshair+tooltip, draw-in via `stroke-dashoffset`/`pathLength=1` gated by
`useChartEntrance` — the one spot in this app's charts where the animated
property isn't composite-only `transform`/`opacity`, accepted as the
standard SVG technique per `animation-performance`'s "layout animations
don't always drop frames... pick the one with no downside" allowance for a
single lightweight stroke) and `RankedBarChart` (horizontal bars, final
`width` set directly, entrance via `scaleX` from the left edge — composite-
only, same technique as `SalesTrendChart`'s vertical bars, rotated).

**New `--chart-series-1`/`--chart-series-2` categorical pair and
`--status-good`/`-warning`/`-serious`/`-critical`/`-info` tokens in
`globals.css`, not the dataviz skill's full 8-hue categorical system.**
No chart in this epic plots more than 2 series at once (checked each tab:
Production's consumption-vs-output trend is the only 2-series case;
Profitability/Best Sellers charts are single-series; Stock Health uses
status colors, not categorical identity), so only 2 slots were needed —
chosen deliberately small to stay inside Epic 9's "one accent, not accent-
everywhere" restraint rather than introducing a wide saturated palette.
`--chart-series-1` reuses the existing `--primary` amber in light mode but
needed its own darker dark-mode step (`oklch(0.6 0.14 70)` = `#b46e00`,
not the UI `--primary`'s `oklch(0.78 0.15 72)`) — the brighter UI primary
measured outside the dataviz skill's categorical lightness band (L
0.48–0.67) against the dark chart surface. `--chart-series-2` is blue
(`#2a78d6` light / `#3987e5` dark), the skill's own reference-palette slot
1 hex, reused as-is. Both validated with the skill's
`validate_palette.js` against this app's actual rendered surfaces
(`#ffffff` light / `#0a0a0a` dark, read via a canvas `fillStyle` roundtrip
from the real `oklch()` CSS values, not eyeballed) — all checks pass in
both modes. The status palette is the dataviz skill's fixed, pre-validated
4-role hex set used verbatim (never re-derived — the skill documents this
set as "fixed, never themed"); it intentionally fails the skill's own
categorical CVD/contrast gates when validated as a generic palette, which
the skill's own docs call out as by-design, mitigated by always pairing a
status color with an icon + text label, never color alone — every
`StatusBadge` in `stock-health-tab.tsx` does this. The 5th Stock Health
status (`OVERSTOCKED`, not covered by the skill's 4-role good/warning/
serious/critical set) reuses `--chart-series-2`'s blue as an "info" cue
rather than inventing an unvalidated 5th hue.

**Production tab's "Expected output" is computed from raw-material
consumption that isn't attributed per-product — a known approximation,
not a bug.** Epic 14 deliberately kept `RawMaterialLedgerEntry.CONSUMED`
entries "free-standing," not linked to a specific product or batch (see
its own Open Questions: "revisit only if Epic 17's variance report turns
out to need tighter attribution"). Since that revisit didn't happen,
`BuildProductionReport` (`src/app/api/graphql/route.ts`) computes each
product's expected output as *(that material's total period consumption)
÷ (recipe ratio)*, using the **minimum** across all of a product's recipe
rows as the bottleneck constraint when it has more than one — correct
when a material is used by only one product, an overestimate when shared
across several. Flagged here explicitly rather than silently shipped;
revisit by adding per-product attribution to `RawMaterialLedgerEntry` if
this turns out to matter in practice.

**Stock Health's 5-way status bucketing uses judgment-call multiplier
constants against `Product.lowStockThresholdKg`** — the epic doc names
the 5 statuses but not the thresholds. `STOCK_HEALTH_CRITICAL_RATIO = 0.5`
(below half the threshold = Critical), `STOCK_HEALTH_OVERSTOCKED_RATIO = 3`
(above 3× threshold = Overstocked), everything between Low and Healthy.
A product with no threshold configured (Epic 8's opt-in nullable field)
can't be bucketed into Critical/Low/Overstocked without a baseline, so it
reads as Healthy whenever it has stock > 0, rather than blocking the
report or inventing a 6th "unclassified" status. `daysOfCover` comes from
a trailing-30-day average daily sale velocity (same window convention as
`BuildSalesTrend`'s dashboard query), `null` when velocity is 0 rather
than an infinite/divide-by-zero value.

**Period semantics for `productionReport`: "current period" always means
the day/week/month containing *now*, ending in the future relative to the
query (not a historical closed period).** This lets `closing` read
straight from the live cached balance (`StockBalance`/
`RawMaterialBalance.quantityKg`) instead of a separate "find the last
entry before period-end" query — correct specifically because period-end
is always after "now" for a still-in-progress period, matching the paper
Daily Stock Report's own "filled in as the day progresses" nature.
`opening` is derived algebraically (`closing − received + consumed`)
rather than queried, avoiding an extra per-material/per-product lookup.
Trend windows are fixed per granularity (14 days / 8 weeks / 6 months) —
not configurable, matching `BuildSalesTrend`'s precedent of a fixed
window rather than a user-adjustable range.

**Best Sellers' "day/week/month/custom range" period selector is a plain
`days: Int` GraphQL arg, not real calendar date-range picking.** The UI
offers Day/Week/Month preset buttons (1/7/30) plus a "Custom days" number
input, all resolving to the same integer — chosen over building a full
start/end date picker since every other analytics period in this app
(dashboard's 30-day trend, Profitability's 30-day window) is already
"trailing N days," not an arbitrary range; matching that convention here
was simpler and consistent, not a compromise forced by time.

**No new `DataTable<T>` sort/filter feature — Profitability's and Stock
Health's "sortable"/"filterable" tables implement it locally (a sort-by
`Select` + direction-toggle `Button`, plus a status `Select` + search
`Input` for Stock Health), sorting/filtering the already-fetched array
client-side via `useMemo` before passing to `DataTable`.** Deliberately
scoped to these two call sites rather than adding column-header-click
sorting to the shared `DataTable<T>` primitive (which all 9+ existing
consumers would inherit) — these GraphQL queries return a small, already-
fully-loaded array (no pagination), so client-side sort/filter needs no
server round-trip, and a shared-primitive change wasn't needed for two
call sites.

**New `src/components/ui/tabs.tsx`** wraps Radix `Tabs` with the same
radius/ring conventions as every other Epic 9-era primitive — floating-
panel pieces aren't needed here (no popover), just a `border-b`
underline-style `TabsList` matching `product-detail.tsx`'s existing
hand-rolled tab switcher's visual language (that file's own switcher is
explicitly out of scope for this epic, left untouched). `AnalyticsHub`
relies on Radix `Tabs.Content`'s default behavior of not rendering
inactive panels into the DOM — this alone gives every tab's GraphQL query
its "fetched lazily when first opened" behavior with no manual `enabled`
wiring needed at the composing layer (the `use*` hooks still accept an
`enabled` param for flexibility, but every call site just passes `true`).

**Files touched:** `prisma` unchanged (no new schema — reads Epics 8/14/15's
tables only); `src/app/api/graphql/route.ts` (+4 queries/types/resolvers);
`src/features/analytics/validators/analytics.schema.ts`,
`services/analytics.service.ts`, `hooks/use-analytics.ts` (+4 each); new
`src/features/analytics/components/{production,profitability,stock-health,
best-sellers}-tab.tsx`, `analytics-hub.tsx`, `trend-line-chart.tsx`,
`ranked-bar-chart.tsx`, `stat-tile.tsx`; new `src/components/ui/tabs.tsx`;
`src/app/globals.css` (+categorical/status tokens); `nav-config.ts` (+
Analytics item); new `src/app/(dashboard)/manager/analytics/page.tsx`.
Verified with `pnpm lint`, `pnpm test`, `npx tsc --noEmit` (all clean) and
a Playwright pass signed in as `manager`: all 4 tabs load real data end to
end (Production's granularity toggle, Profitability's stat-tile count-up +
excluded-sale note + sortable table, Stock Health's status badges +
distribution chart + filter/search/sort, Best Sellers' preset/custom
period buttons + both rankings' trend indicators), light and dark mode,
and a 375px mobile viewport (tabs wrap, `DataTable`'s card view, bottom
nav shows the new Analytics tab).

---

## 2026-11-08 — Epic 16 (Motion: Page Transitions & Chart Animations) decisions

**Research spike outcome: the View Transitions API via React 19.3's native
`<ViewTransition>` component, not a JS animation library (`motion`).**
Confirmed via `node_modules/next/dist/docs/01-app/02-guides/view-
transitions.md` (per AGENTS.md's "this is NOT the Next.js you know, read
the docs first" rule) that Next 16.4.5 supports `<ViewTransition>` "in the
App Router with no configuration," and that route navigations are
Transitions automatically — no interaction with `cacheComponents`/the
`instant = false` opt-outs beyond one documented nuance: if a destination
page suspends (which every `instant = false` page does, by design, since
it blocks on a session read), "no \[shared-element] pair forms, and the
content animates with its enter animation instead when it arrives" — fine
for a plain crossfade with no named/shared elements, which is all this
epic uses. Chosen over `motion` per the `animate` skill's "cheapest tool
that works" rule: zero new dependency, officially documented as
compatible with this exact stack, and progressively enhances (no-ops on
browsers without View Transitions support, confirmed by the doc).

**The crossfade is a plain, unnamed `<ViewTransition>` wrapping `{children}`
at each shell boundary — not Next's own documented directional-slide
pattern (Step 3 of the guide), and not per-`page.tsx` wrapping.** The
guide's directional-slide example explicitly requires wrapping every
participating `page.tsx` individually ("layouts persist across
navigations, so enter and exit never fire there"), but that's specific to
*named* `transitionTypes`-driven slides — an unnamed `<ViewTransition>`
wrapping `{children}` inside a Server Component layout still works for a
plain crossfade, because the *children* passed to it change on every
navigation (different page component tree), which is enough for React to
treat it as changed content needing the browser's default old/new
crossfade. This needed no client-side `usePathname()` tracking and no
per-page edits — matches the epic's explicit "applied once at the shell
level" scope far better than the directional pattern would have, and the
epic's own "short and subtle... not a marketing site" framing favored a
plain fade over directional slides anyway. New `src/components/motion/
page-transition.tsx` (a 6-line wrapper, importable directly into Server
Components — `<ViewTransition>` needs no `"use client"`, same as
`Suspense`) is used in `(dashboard)/layout.tsx`, `app/page.tsx`, and
`auth/layout.tsx` per the epic's file list. Styling (150ms, the skill's
`cubic-bezier(0.23, 1, 0.32, 1)` strong ease-out, `pointer-events: none`
on the transition overlay so clicks aren't lost mid-animation, and a
`prefers-reduced-motion` override to a near-zero duration) lives in
`globals.css` on the wildcard `::view-transition-old(*)`/`-new(*)`
pseudo-elements, shortened from the browser's ~250ms default per the
`animate` skill's "UI animations stay under 300ms" + this being daily-use
functional chrome, not a marketing moment.

**Chart-entrance primitives are three small, independent hooks in
`src/components/motion/`, not one combined component** —
`useReducedMotion` (shared `matchMedia` source of truth), `useChartEntrance`
(a `hasEntered` boolean that flips `true` one frame after mount, gating a
CSS transition between an initial and final state; renders already-entered
under reduced motion, not disabled — "fewer and gentler, not zero" per the
`animate` skill), and `useCountUp` (writes a formatted number to a ref's
`textContent` inside `requestAnimationFrame`, never through `setState` —
the `animation-performance` skill's explicit "React: Don't Animate Through
State" rule, since a per-frame re-render would blow the frame budget for a
dashboard stat tile). Split into three because each has a different
reduced-motion behavior and a different "what gates it" signal (mount vs.
data-ready vs. target-value-changed), and `useCountUp` in particular needs
no entrance-boolean plumbing at all — it's self-contained.

**`SalesTrendChart`'s bar entrance is a composite-only `scaleY` transform
from a zero baseline (`transform-origin: bottom`), layered on top of the
bar's existing `height: {percent}%` inline style rather than animating
`height` itself.** `height` stays exactly as it was (set directly to its
final value, no transition) — only `transform` animates, per
`animation-performance`'s "swapping down a tier" table (`height`/`padding`
→ `scale()`). Per-bar stagger is capped (`Math.min(index * 6, 220)ms`),
not a flat 50ms-per-item like the `animate` skill's generic stagger
recipe — a flat 50ms × 30 bars would spread the reveal over 1.5s, far past
the "near-imperceptible... fast and subtle" bar this epic's gate check
lands on (a dashboard chart reveals on every page load, closer to the
skill's "tens of times/day" frequency tier than a rare marketing moment,
even though the epic doc explicitly requires some entrance treatment).
Total reveal is ~320ms + a 220ms-capped stagger spread, not 1.5s+.

**Files touched:** new `src/components/motion/{page-transition,
use-reduced-motion,use-chart-entrance,use-count-up}.{tsx,ts}`;
`src/app/globals.css` (+view-transition CSS); `src/app/(dashboard)/
layout.tsx`, `src/app/page.tsx`, `src/app/auth/layout.tsx` (+
`PageTransition` wrapper); `src/features/analytics/components/
sales-trend-chart.tsx` (bar entrance retrofit). Verified with `pnpm lint`,
`pnpm test`, `npx tsc --noEmit` (all clean) and a Playwright pass: a real
client-side navigation between `/manager/categories` and `/manager/
products` completed with no console errors (confirming `<ViewTransition>`
doesn't crash SSR or client navigation), the dashboard's retrofit chart
rendered correctly in light and dark mode. The entrance animation's actual
*feel* (stagger timing, draw-in smoothness) wasn't separately motion-
captured/frame-profiled beyond this — flagged per the `animate` skill's
own "what to feel-check" guidance for a future pass if it ever looks off
on a real device.

---

## 2026-11-08 — Epic 15 (Product Cost & Margin Tracking) decisions

**`Cost` mirrors `Price` exactly, field-for-field and route-for-route** —
same `effectiveFrom`/`effectiveTo` open-row pattern, same
"`SetNewProductCost` closes the previous open row before creating the new
one in one transaction" logic as `SetNewProductPrice`, same
`api/v1/products/[id]/costs` GET(paginated)/POST(`product:manage`) shape
as `.../prices`. No deviation was needed or introduced — this is the
epic doc's own explicit ask ("mirrors Price's own... design exactly").

**`Sale.costPerKgAtSale` is populated by one additional `prisma.cost.
findFirst({ effectiveTo: null })` lookup inside the existing `POST /api/
v1/sales` handler, added right alongside the existing active-`Price`
lookup — not a new mutation path.** Unlike the active-`Price` lookup
(which 400s the whole sale if missing — "Product has no active price"),
a missing active `Cost` does **not** block the sale: `costPerKgAtSale`
is simply written as `null`. This is the one deliberate asymmetry between
Price and Cost in this epic — Price is a hard precondition for selling at
all (there'd be no `totalAmount` to compute), Cost is purely informational
for later margin reporting, per the epic doc's own "doesn't block the
sale" framing.

**`ProductDetail`'s new "Cost history" tab is a close structural copy of
the existing "Price history" tab (`CostHistoryTab`/`CostHistory`/
`SetCostForm` mirroring `PriceHistoryTab`/`PriceHistory`/`SetPriceForm`
line-for-line), added as a 3rd tab alongside Epic 14's new "Recipe" tab**
(landed in the same session, same file) — `product-detail.tsx`'s tab list
is now Details/Price history/Cost history/Recipe. `ProductOverview`'s
`dl` (the Details tab) was **not** given a "Current cost" row the way it
already has "Current price / kg" — the epic's own schema section only
adds `currentPrice` precedent to `Price`, never asks for an equivalent
`currentCost` field on the `Product` DTO, and Cost is meant purely as an
internal COGS input feeding Epic 17's margin math, not a Manager-facing
headline figure the way price is.

**Files touched:** `prisma/schema.prisma` (+`Cost` model, +`Sale.
costPerKgAtSale`); new `src/features/products/{validators/cost.schema,
services/cost.service,hooks/use-costs,components/cost-history,
components/set-cost-form}.ts(x)`; `src/features/products/components/
product-detail.tsx` (+Cost history tab); `src/features/sales/validators/
sale.schema.ts` (+`costPerKgAtSale` field); `src/app/api/v1/products/
[id]/costs/route.ts` (new); `src/app/api/v1/sales/route.ts` (+Cost
lookup). Schema pushed to the dev database via `prisma db push` (explicit
user consent obtained first — Prisma's AI-agent safety gate blocks this
command for any agent without it). Verified with `pnpm lint`, `pnpm test`,
`npx tsc --noEmit` (all clean) and a Playwright pass signed in as
`manager`: set a new cost on a product via the modal, confirmed it
appeared in the Cost history table as the current row, light and dark
mode.

---

## 2026-11-08 — Epic 14 (Raw Materials & Production Tracking) decisions

**`RawMaterial`/`RawMaterialBalance`/`RawMaterialLedgerEntry` mirror
`Product`(partial)/`StockBalance`/`StockLedgerEntry` field-for-field**
(cached-balance + append-only-ledger hybrid, per the existing "Stock and
loan balances" pattern) — `POST /api/v1/raw-materials/[id]/activity`
mirrors `POST /api/v1/stock/accept`'s upsert-balance-then-create-ledger-
entry transaction shape almost exactly, just with a signed `delta`
(RECEIVED `+1`, CONSUMED `-1`) instead of Stock's always-positive ACCEPT.
**No guard against consuming more of a material than is on hand** — the
same deliberate non-guard Stock's own `SALE` path has ("no guard against
overselling," logged under Epic 6), kept consistent rather than
introducing a new validation rule Epic 14 never asked for.

**`GET /api/v1/raw-materials` (the catalog list) and the balances/ledger
routes accept either `raw-material:read` or `raw-material:manage`, not
`raw-material:manage` alone** — unlike `GET /api/v1/categories`, which is
Manager-only end to end. The difference: Inventory Manager needs to read
the material *names* to populate the picker on "Record activity"
(`/inventory/materials`), the same reason `product:read` was added to
`INVENTORY_MANAGER_PERMISSIONS` back in Epic 4 for the product picker on
Accept Stock. Mirrors the loans-transactions route's existing multi-
permission-array pattern (`CreateApiRoute`'s `permission: string[]` →
`CheckAnyPermission`).

**The recipe/BOM editor (`ProductMaterialRequirement` CRUD) lives on the
product detail page as a 3rd tab ("Recipe"), not on the materials
settings page** — the epic doc left this an open implementation call.
Chosen because a recipe is fundamentally *per-product* data best browsed
from the product it belongs to (matching where Price/Cost history already
live), and a materials-settings-page placement would mean either listing
every product's full recipe on one page (noisy, mostly-irrelevant to a
Manager editing one material's catalog entry) or adding per-material
"used by which products" drill-down that isn't what the epic asked for.
`api/v1/products/[id]/material-requirements` (GET/POST/PATCH, no DELETE —
the epic's own API section lists exactly these three methods) backs it;
PATCH takes `{materialId, quantityKgPerOutputKg}` in the body rather than
a `/[materialId]` sub-route, since the epic doc names the route as the
flat collection path for all three methods, not a nested one.

**"Expected output" math wasn't built in this epic — intentionally.**
The epic's own Open Questions resolve to "free-standing daily entry... not
required for every product... revisit only if Epic 17's variance report
turns out to need tighter attribution." `RawMaterialLedgerEntry.CONSUMED`
rows carry no `productId`/batch link as a result. Epic 17 does build a
variance report on top of this (see its own decisions entry above) using
an approximation (total material consumption ÷ recipe ratio, not
attributed per-product) rather than this epic's ledger shape being
revisited — flagged there, not a defect in this epic's schema.

**New "Materials" top-level nav item in both `MANAGER_NAV_ITEMS` and
`INVENTORY_NAV_ITEMS`** (`FlaskIcon`), positioned right after "Stock" in
both lists — mirrors Stock's own Manager-read-only-list vs. Inventory-
operational-page split (`/manager/materials` + `/manager/materials/
[materialId]` read-only ledger view; `/inventory/materials` balances +
a modal "Record activity" trigger, Epic 13's modal pattern, not a
separate `/inventory/materials/activity` page the way Stock's older
"Accept Stock" predates Epic 13's modal convention). `/manager/settings/
materials` (the catalog CRUD) is linked from the existing Settings hub,
not a nav item, per the epic doc's explicit instruction.

**Files touched:** `prisma/schema.prisma` (+`RawMaterial`,
`RawMaterialBalance`, `RawMaterialLedgerEntry`, `RawMaterialEntryType`,
`ProductMaterialRequirement`; `Product` +`materialRequirements` relation);
`prisma/seed.ts` (+`raw-material` module/permissions); new
`src/features/raw-materials/` (validators, services, hooks, 7 components);
new `src/app/api/v1/raw-materials/**`, `src/app/api/v1/products/[id]/
material-requirements/route.ts`; `src/features/products/components/
product-detail.tsx` (+Recipe tab); `src/components/shell/nav-config.ts`
(+Materials); `src/app/(dashboard)/manager/settings/page.tsx` (+link);
new pages at `manager/settings/materials`, `manager/materials`,
`manager/materials/[materialId]`, `inventory/materials`. Schema pushed
to the dev database via `prisma db push` (explicit user consent obtained
first). Verified with `pnpm lint`, `pnpm test`, `npx tsc --noEmit` (all
clean) and a Playwright pass: full catalog CRUD (add/edit material) as
`manager`, "Record activity" (Received, 200kg) as `inventory` confirmed
the balance updated and the Manager-side ledger detail page showed the
entry, a recipe row added to a product and reflected immediately — light
and dark mode, 375px mobile viewport (bottom nav + `DataTable` card view).

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
