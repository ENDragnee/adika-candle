# Epic 7 — Users + RBAC Management UI

**Depends on:** 1 (Foundation/Shell)
**Status:** not-started

## Goal

Manager can manage users, roles, and permission assignments from the UI
instead of editing raw seed data — this is what the `Role`/`Permission`/
`Module` tables (already in the schema, "modeled as data" per
`docs/DECISIONS.md`) were built for.

## Pages & permissions

| Route | Notes | Permission |
|---|---|---|
| `/manager/users` | list, create, deactivate, assign role | `user:manage` |
| `/manager/roles` | list roles, edit permission assignments per role | `role:manage` |

## Schema

None new — uses the existing `User`, `Role`, `Permission`, `Module`
models from `prisma/schema.prisma`.

## API routes

REST: `api/v1/users` (GET list, POST create), `api/v1/users/[id]` (PATCH — role assignment, deactivate), `api/v1/roles` (GET list), `api/v1/roles/[id]/permissions` (PATCH — set permission list for a role).

## Feature folders

- `src/features/users/`
- `src/features/roles/`

## Out of scope

- No new permission *types* are invented here beyond what Epics 1–6
  already seeded/used — this epic is purely the admin UI over existing
  data, not a place to add new modules/permissions.

## Open questions

None.
