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
