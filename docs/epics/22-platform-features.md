# Epic 22 — Platform Features (activity log, date ranges, roles, pagination, resilience)

**Depends on:** 21 (Manager UX & Logic Audit Fixes)
**Status:** in-progress

## Goal

Nine requests from the owner, validated against the code on 2026-11-12
before any work started. Each item states what the validation found, then
the scope agreed for it.

## 1. Motion feels wonky and too fast

**Found:** `useCountUp` re-runs whenever its `format` argument changes, and
every caller passes an inline function. So *any* re-render (a refetch,
a hover, typing in a filter) resets the number to 0 and replays the count.
That's the "wonky" part. Durations are also at the fast end: route crossfade
150ms, bar entrance 320ms with a 6ms stagger, line draw 500ms.

**Scope:** count-up plays once per mount and later value changes ease
from the old value; `format` is read through a ref, not as an effect
dependency. Route crossfade 220ms, bar/strip entrance about 520ms with a
calmer stagger, line draw 750ms, and bar heights ease when data changes
instead of jumping. Reduced motion stays honoured everywhere.

## 2. Tablet width (about 800px)

**Found:** DataTable's card view only applies below `md` (768px). At 800px
the open 240px sidebar leaves about 560px, so wide tables scroll sideways.

**Scope:** the sidebar defaults to collapsed (icons only) between `md` and
`lg` unless the person expands it, and DataTable uses its card layout
below `lg`. Filter bars wrap cleanly at that width.

## 3. Activities page

**Found:** a `Log` model exists, but nothing writes to it.

**Scope (agreed: every change and every sign-in):**
- `Log` is extended into an activity record: actor, action, entity type/id/label,
  a human summary, structured changes, IP and user agent.
- Every successful mutating API request is recorded by the API layer
  (`CreateApiRoute`). Routes describe their event declaratively, and a
  generic fallback records anything not described, so a new route can
  never silently skip the log.
- Sign-in, sign-out and failed sign-in are recorded through better-auth hooks.
- `/manager/activities` (new permission `activity:read`) uses cursor
  pagination, filters for date range / person / area / action, and search.

## 4. Custom date filters

**Found:** Sales has preset ranges only. Analytics uses fixed windows
(profitability 7/30/90, best sellers N days, production period stepper).

**Scope:** one shared `DateRangeFilter` (presets + custom from/to in the
business time zone), used on Sales, Activities, Profitability and Best
Sellers, plus a "Custom range" mode on Production. GraphQL
profitability/bestSellers/productionReport accept `from`/`to`, capped at
366 days.

## 5. Create roles

**Found:** users are sent home after sign-in by role **name**, so a new
role would land on "unauthorized". The two built-in roles' names are also
referenced in code (`ROLES.MANAGER`).

**Scope (agreed: home page = first page the permissions allow):**
create (optionally copying another role's permissions), rename/describe,
and delete custom roles. The built-in roles can't be renamed or deleted, and a
role with users assigned can't be deleted. The post-sign-in redirect and the
product tour derive from permissions.

## 6. Pagination everywhere

**Found:** every list endpoint except `roles` already uses offset pagination,
behind one shared control (Prev / Page X of Y / Next). Analytics tables
and the roles matrix are not paginated.

**Scope:** one richer `Pagination` (range text, numbered pages with
ellipsis, page-size choice), used by every list. Analytics tables get
client-side paging through DataTable. Activities use **cursor**
pagination (stable under constant inserts).

## 7. Password validation (Users)

**Agreed:** Manager reset only. The "Set password" form gets a confirm field,
strength rules with a live checklist, and an option to sign the user out
everywhere.

## 8. Skeletons and loaders

**Found:** data views have skeletons (Epic 10), but no route has a
`loading.tsx`, so navigation shows nothing while the server checks the
session. Submit buttons show "Saving…" text inconsistently.

**Scope:** `loading.tsx` for every dashboard route, with page-shaped skeletons,
and a `Button` `loading` prop (spinner + disabled) used by every submit.

## 9. Error modals, pages and toasts

**Found:** error boundaries exist; there's no 404 page; every mutation hook
hand-writes its own error toast; a 401 (expired session) or 403 isn't handled
globally.

**Scope:** `not-found.tsx` pages; error pages with a reference id and
recovery actions; API responses carry `x-request-id`. Errors are handled
centrally in the QueryClient: an expired session gets a toast and a redirect
to sign-in, 403 gets a permission toast, and other failures get a toast with
a **Details** action that opens an error dialog (message, code, reference
id, copy button).
