# Epics

Full-domain build, planned in dependency order. Execute one at a time —
don't start an epic whose "Depends on" isn't done. See
[`../DECISIONS.md`](../DECISIONS.md) for the *why* behind non-obvious
choices referenced below, and [`../../AGENTS.md`](../../AGENTS.md) for repo
conventions.

| # | Epic | Depends on | Status |
|---|------|------------|--------|
| 1 | [Foundation / Shell](./01-foundation-shell.md) | — | done |
| 2 | [Categories + Products + Pricing](./02-categories-products-pricing.md) | 1 | done |
| 3 | [Unit Settings](./03-unit-settings.md) | 1 | done |
| 4 | [Stock](./04-stock.md) | 1, 2, 3 | not-started |
| 5 | [Customers + Loans](./05-customers-loans.md) | 1 | not-started |
| 6 | [Unified Sales Flow](./06-unified-sales-flow.md) | 2, 3, 4, 5 | not-started |
| 7 | [Users + RBAC Management UI](./07-users-rbac-ui.md) | 1 | not-started |
| 8 | [Analytics / Dashboards](./08-analytics-dashboards.md) | 2, 4, 5, 6 | not-started |

Update the Status column as epics move through
not-started → in-progress → done.
