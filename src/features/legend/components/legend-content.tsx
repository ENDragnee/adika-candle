"use client";

import {
  CheckCircleIcon,
  StackIcon,
  WarningIcon,
  WarningOctagonIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Static reference content for the Legend page — authored directly in code,
// not database-backed or Manager-editable (docs/epics/19-legend-walkthrough-
// reference.md). Every number/threshold/field name below is copied from the
// real schema/logic it describes, not re-derived from memory, so this page
// can't silently drift from app behavior:
// - Stock Health thresholds: src/app/api/graphql/route.ts
//   (STOCK_HEALTH_CRITICAL_RATIO / STOCK_HEALTH_OVERSTOCKED_RATIO)
// - LoanAccount.balance sign: docs/DECISIONS.md, 2026-11-07
// - Role permission sets: prisma/seed.ts
//
// Status meta intentionally duplicated from stock-health-tab.tsx rather than
// imported across feature folders — this is five display rows, not shared
// logic, and this app's feature-folder convention keeps features
// independent (see AGENTS.md).
const STOCK_HEALTH_STATUSES: {
  label: string;
  icon: typeof CheckCircleIcon;
  colorVar: string;
  rule: string;
}[] = [
  {
    label: "Out of stock",
    icon: XCircleIcon,
    colorVar: "var(--color-status-critical)",
    rule: "Quantity on hand = 0.",
  },
  {
    label: "Critical",
    icon: WarningOctagonIcon,
    colorVar: "var(--color-status-serious)",
    rule: "Quantity < 50% of the product's low-stock threshold.",
  },
  {
    label: "Low",
    icon: WarningIcon,
    colorVar: "var(--color-status-warning)",
    rule: "Quantity ≥ 50% but < 100% of the threshold.",
  },
  {
    label: "Healthy",
    icon: CheckCircleIcon,
    colorVar: "var(--color-status-good)",
    rule: "Quantity between 100% and 300% of the threshold — or the product has no threshold set at all (no baseline to bucket against, so a stocked product defaults here rather than blocking the report).",
  },
  {
    label: "Overstocked",
    icon: StackIcon,
    colorVar: "var(--color-status-info)",
    rule: "Quantity > 300% of the threshold.",
  },
];

// Term + description row, shared by the "Daily Stock Report columns" and
// "Ledger entry types" sections below. Deliberately not the shared
// src/components/ui/table.tsx primitive: that component's auto table layout
// sizes each column to its widest cell's unwrapped width (fine for the
// short tabular data it's used for elsewhere), which let a long prose
// description run off the card edge instead of wrapping. A plain flex row
// wraps naturally at any width — better suited to definition-style content
// than a data table.
function DefinitionRow({
  term,
  children,
}: {
  term: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-6">
      <div className="shrink-0 text-sm font-medium text-foreground sm:w-48">
        {term}
      </div>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

export function LegendContent() {
  return (
    <div className="flex flex-col gap-6">
      <section id="daily-stock-report" className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          1. Daily Stock Report columns
        </h2>
        <p className="text-sm text-muted-foreground">
          The paper "Daily Stock Report" factory staff already fill out uses
          four columns. The app's own Production report (Manager → Analytics →
          Production tab) and the raw-material ledger reuse these exact labels,
          so the mental model carries straight over:
        </p>
        <div className="divide-y divide-border overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <DefinitionRow term="Opening Stock">
            Quantity on hand at the start of the period. Computed algebraically
            (Closing − Received + Consumption), not stored separately.
          </DefinitionRow>
          <DefinitionRow term="Received">
            Stock accepted (finished goods) or materials received during the
            period.
          </DefinitionRow>
          <DefinitionRow term="Consumption">
            Stock sold (finished goods) or raw materials consumed into
            production during the period.
          </DefinitionRow>
          <DefinitionRow term="Closing Stock">
            Quantity on hand right now — read straight from the live cached
            balance (<code>StockBalance</code> or{" "}
            <code>RawMaterialBalance</code>), since "now" is always inside the
            still-in-progress current period.
          </DefinitionRow>
        </div>
      </section>

      <section id="sales" className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          2. Sales: cash vs loan, walk-in vs named customer
        </h2>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            Every sale has a{" "}
            <strong className="text-foreground">payment type</strong>:{" "}
            <Badge variant="outline">CASH</Badge> or{" "}
            <Badge variant="outline">LOAN</Badge>. A <code>LOAN</code> sale is
            paid for later and adds to the customer's outstanding loan balance
            instead of being settled immediately.
          </p>
          <p>
            Every sale also has a{" "}
            <strong className="text-foreground">customer</strong> field, and it
            can be empty: <code>null</code> means a{" "}
            <strong className="text-foreground">walk-in</strong> buyer with no
            account. A named <code>Customer</code> record (Merkato, Gondor,
            Moges, Mekele, etc.) is a standing account that can carry a loan
            balance across multiple sales. A walk-in sale can only be paid CASH
            — there's no account to lend against.
          </p>
        </div>
      </section>

      <section id="loan-balance" className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          3. Loan balance sign convention
        </h2>
        <Card
          size="sm"
          className="border-l-2 border-l-(--color-status-warning)"
        >
          <CardContent className="text-sm">
            <p>
              <strong className="text-foreground">
                A positive <code>LoanAccount.balance</code> means the customer
                owes the business.
              </strong>{" "}
              A negative balance means the business owes the customer — for
              example, an advance the customer paid in that hasn't been redeemed
              against a purchase yet. It's easy to get this backwards, so it's
              worth re-reading before interpreting any balance on a customer's
              loan ledger.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="ledger-entries" className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          4. Ledger entry types
        </h2>
        <p className="text-sm text-muted-foreground">
          Both finished-goods stock and raw materials use the same shape: a
          cached running balance, plus an append-only ledger of every movement
          that produced it. The entry types differ slightly between the two:
        </p>
        <div className="divide-y divide-border overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <DefinitionRow
            term={
              <>
                <code>ACCEPT</code> / <code>RECEIVED</code>
              </>
            }
          >
            Stock/material came in.
          </DefinitionRow>
          <DefinitionRow
            term={
              <>
                <code>SALE</code> / <code>CONSUMED</code>
              </>
            }
          >
            Stock went out via a sale, or material was used in production.
          </DefinitionRow>
          <DefinitionRow
            term={
              <>
                <code>ADJUSTMENT</code> / <code>ADJUSTMENT</code>
              </>
            }
          >
            A manual correction (e.g. a stock count discrepancy).
          </DefinitionRow>
        </div>
      </section>

      <section id="unit-conversions" className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          5. Unit conversions
        </h2>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            Everything is measured in KG internally, but staff work in Carton,
            Packet, Wax, or Kir. Each unit has a <code>ratioToKg</code> (how
            many KG one unit equals), editable by a Manager under Settings →
            Unit conversions.
          </p>
          <p>
            <strong className="text-foreground">
              A sale or stock entry snapshots the ratio at the moment it's
              recorded
            </strong>{" "}
            — the input quantity, unit name, and ratio are all stored on the
            transaction itself. Editing a unit's ratio later only affects future
            transactions; it never rewrites or changes the totals of anything
            already recorded.
          </p>
        </div>
      </section>

      <section id="stock-health" className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          6. Stock Health statuses
        </h2>
        <p className="text-sm text-muted-foreground">
          Manager → Analytics → Stock Health buckets every active product into
          one of five statuses, based on its current quantity against its own
          low-stock threshold (a per-product setting a Manager can optionally
          configure on the product):
        </p>
        <div className="flex flex-col gap-2">
          {STOCK_HEALTH_STATUSES.map((status) => {
            const Icon = status.icon;
            return (
              <Card key={status.label} size="sm">
                <CardContent className="flex items-start gap-3">
                  <Icon
                    className="mt-0.5 size-5 shrink-0"
                    style={{ color: status.colorVar }}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">
                      {status.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {status.rule}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="roles" className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          7. Manager vs Inventory Manager
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Manager</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                <li>Full access to everything Inventory Manager can do.</li>
                <li>Categories, products, and pricing.</li>
                <li>Product cost entry and margin/profitability analytics.</li>
                <li>Raw material catalog and recipe (BOM) setup.</li>
                <li>
                  Stock and loan oversight, including manual loan adjustments.
                </li>
                <li>
                  The full Analytics hub (Production, Profitability, Stock
                  Health, Best Sellers).
                </li>
                <li>
                  Users, roles, and system settings (unit conversions, raw
                  material catalog).
                </li>
              </ul>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>Inventory Manager</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                <li>Accept stock and record sales (cash or loan).</li>
                <li>
                  Record raw material activity (Received/Consumed) against the
                  catalog a Manager maintains.
                </li>
                <li>
                  View customers and record loan repayments — day-to-day loan
                  activity, not manual corrections.
                </li>
                <li>
                  Read-only access to the product catalog, just enough to pick a
                  product when recording a sale or accepting stock.
                </li>
                <li>
                  No access to pricing, costs, analytics, raw material catalog
                  management, or user/role administration.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
