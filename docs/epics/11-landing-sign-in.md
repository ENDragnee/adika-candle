# Epic 11 — Landing / Sign-in Page

**Depends on:** 9 (Design System Foundation)
**Status:** done

## Goal

Replace the bare sign-in form with one minimal, polished welcome+sign-in
screen — the user's "minimal landing page" ask, scoped to this single
pre-auth screen rather than a public marketing site (see
`docs/DECISIONS.md`, "Epic 11 decisions" once logged, for why: this is a
two-role internal ops tool with no public signup and no product
photography, so `design-taste-frontend`'s full asset pipeline doesn't
apply — `frontend-design`'s restraint/typography principles do).

## Scope

- `src/features/auth/components/sign-in-form.tsx` and
  `src/app/auth/layout.tsx` redesigned with Epic 9's `Card`, accent color,
  and Geist Sans: a short real line on what Adika Candle is (candle
  factory sales/stock/loan management), then the sign-in form.
- No new routes. No change to `src/proxy.ts`'s one-directional redirect
  behavior or `RoleRedirector` — both stay exactly as documented in
  `docs/DECISIONS.md` ("Used `src/proxy.ts`... Correction (same day)").

## Schema

None.

## API routes

None new.

## Feature folders

- `src/features/auth/`

## Out of scope

- No public marketing content, no multi-section landing page, no stock
  photography, no new public routes for unauthenticated visitors beyond
  the existing `/auth/sign-in`.

## Open questions

None.
