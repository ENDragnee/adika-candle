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
| 4 | [Stock](./04-stock.md) | 1, 2, 3 | done |
| 5 | [Customers + Loans](./05-customers-loans.md) | 1 | done |
| 6 | [Unified Sales Flow](./06-unified-sales-flow.md) | 2, 3, 4, 5 | done |
| 7 | [Users + RBAC Management UI](./07-users-rbac-ui.md) | 1 | done |
| 8 | [Analytics / Dashboards](./08-analytics-dashboards.md) | 2, 4, 5, 6 | done |
| 9 | [Design System Foundation](./09-design-system-foundation.md) | 1 | done |
| 10 | [Loading States (Skeletons)](./10-loading-states.md) | 9 | done |
| 11 | [Landing / Sign-in Page](./11-landing-sign-in.md) | 9 | done |
| 12 | [Page-by-Page Polish](./12-page-polish.md) | 9 | done |
| 13 | [Modal & Action-Menu UX](./13-modal-action-menu-ux.md) | 9 | done |
| 14 | [Raw Materials & Production Tracking](./14-raw-materials-production-tracking.md) | 1, 2 | done |
| 15 | [Product Cost & Margin Tracking](./15-product-cost-margin-tracking.md) | 2, 6 | done |
| 16 | [Motion: Page Transitions & Chart Animations](./16-motion-page-transitions-chart-animations.md) | 9 | done |
| 17 | [Analytics Hub (Tabbed)](./17-analytics-hub.md) | 8, 14, 15, 16 | done |
| 18 | [Page Header Consolidation](./18-page-header-consolidation.md) | 9 | done |
| 19 | [Legend & Walkthrough Reference Page](./19-legend-walkthrough-reference.md) | 3, 4, 5, 14, 17 | done |
| 20 | [Interactive Product Tutorial](./20-interactive-product-tutorial.md) | 9, 16 | done |
| 21 | [Manager UX & Logic Audit Fixes](./21-manager-ux-logic-audit-fixes.md) | 8, 13, 15, 17 | not-started |

Update the Status column as epics move through
not-started → in-progress → done.
