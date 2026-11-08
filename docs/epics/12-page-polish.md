# Epic 12 — Page-by-Page Polish

**Depends on:** 9 (Design System Foundation)
**Status:** not-started

## Goal

Carry the Epic 9 foundation across every remaining page — mechanical
application, not new architecture.

## Scope

Every feature page not already touched by Epic 9's shared-primitive
adoption: categories, products (list/new/detail), customers, loans,
users, roles, settings/units, stock (list/detail/accept), sales
(list/new). For each: `Card` instead of bare-bordered boxes, adopt
`DataTable` wherever Epic 9 didn't already reach it, drop remaining
`rounded-none`/un-radiused elements, add a phosphor icon to primary
actions where it aids scannability (e.g. a plus icon on "New product").

## Schema

None.

## API routes

None new.

## Feature folders

Touches most of `src/features/**` — see `docs/DECISIONS.md` for the
final file list once implemented rather than enumerating every path here.

## Out of scope

- No behavior changes anywhere — purely visual/markup.
- No exhaustive route-by-route QA pass; verification is a representative
  spot-check (a few list pages, a few forms) plus lint/test/typecheck,
  matching Epic 9's verification approach.

## Open questions

None.
