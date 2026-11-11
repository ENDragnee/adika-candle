# Epic 1 — Foundation / Shell

**Depends on:** —
**Status:** done

## Goal

Everyone can log in and land on a role-correct, permission-gated shell with
no 404s or dead ends, before any domain feature exists. This is the
scaffolding every later epic's pages hang off of.

## Pages & permissions

| Route | Notes | Permission |
|---|---|---|
| `/auth/sign-in` | canonical path (fixes the `/auth/signin` vs `/auth/sign-in` mismatch between `session.ts` and `axios.ts`) | none (public) |
| `/unauthorized` | shown when role/permission guard fails | none (any authed user) |
| `/` | calls `RoleRedirector()` | none (any authed user) |
| `(dashboard)/layout.tsx` | `GetSession()` guard, renders `AppShell` | any authed user |
| `manager/layout.tsx` | role !== `MANAGER` → redirect `/unauthorized` | — |
| `manager/dashboard` | empty shell for now, filled in Epic 8 | `analytics:read` |
| `inventory/layout.tsx` | role !== `INVENTORY_MANAGER` → redirect `/unauthorized` | — |
| `inventory/dashboard` | empty shell for now, filled in Epic 8 | `stock:read` |

`(dashboard)` is a route group only — it adds no URL segment, so
`/manager/dashboard` / `/inventory/dashboard` match what
`src/lib/redirector.ts`'s `RoleRedirector()` already expects.

Gating is defense-in-depth: `middleware.ts` → role layout → per-page
`CheckPermission`/`CheckAnyPermission` → API-layer permission check again.

## Schema

No new domain models. Seed data only:

- `Module` rows: one per domain area (`analytics`, `product`, `category`,
  `stock`, `customer`, `loan`, `sale`, `user`, `role`, `unit-conversion`).
- `Permission` rows, `module:action` convention, one row per permission
  named in the table above and in the other epic files (e.g.
  `product:read`, `product:manage`, `stock:accept`, `loan:record`).
- `Role` rows: `MANAGER` (all permissions), `INVENTORY_MANAGER` (`stock:read`,
  `stock:accept`, `sale:create`, `sale:read`, `customer:read`, `loan:record`).
- One seed `User` per role for local dev (never shipped to prod seed data).

## API routes

None new — reuses the existing better-auth catch-all
(`src/app/api/auth/[...all]/route.ts`).

## Feature folders

- `src/features/auth/` — sign-in form + service calling `src/lib/auth-client.ts`.
- `src/components/shell/` — `AppShell`, permission-aware sidebar nav config
  (shared, not feature-specific, per AGENTS.md's feature-folder rule).

## Other work bundled into this epic

- Fix the `/auth/signin` vs `/auth/sign-in` mismatch: standardize on
  `/auth/sign-in` (matches `src/lib/axios.ts`'s existing redirect and the
  repo's kebab-case convention) and update `src/lib/session.ts`.
- Add `src/proxy.ts` (Next 16 renamed `middleware.ts` to `proxy.ts` — see
  `docs/DECISIONS.md`): unauthenticated hitting `/manager/*` or
  `/inventory/*` → redirect `/auth/sign-in`. Deliberately one-directional
  — does not also redirect cookie-present requests away from `/auth/*`;
  that's left to `src/app/auth/layout.tsx`'s authoritative session check
  (see `docs/DECISIONS.md` for why: a stale cookie made the two checks
  disagree and loop).
- Wire up the already-written but previously unused `RoleRedirector()`
  (`src/lib/redirector.ts`) from `/`.

## Out of scope

- Real dashboard widgets/content (Epic 8).
- User/role *management UI* (Epic 7) — seeding is enough here.
- Any business-domain schema or pages.

## Open questions

None outstanding — resolved during planning (see `docs/DECISIONS.md` for
the signin/sign-in fix rationale once recorded).
