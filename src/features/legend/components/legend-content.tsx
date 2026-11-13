"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToneBadge, ToneColor } from "@/components/ui/tone-badge";
import { LOAN_TRANSACTION_META } from "@/features/loans/labels";
import { MATERIAL_ENTRY_META } from "@/features/raw-materials/labels";
import { PAYMENT_TYPE_META } from "@/features/sales/labels";
import { STOCK_STATUS_META } from "@/features/stock/components/stock-status-badge";
import { STOCK_ENTRY_META } from "@/features/stock/labels";
import {
  CRITICAL_RATIO,
  OVERSTOCKED_RATIO,
  STOCK_STATUSES,
} from "@/features/stock/stock-status";

// Static reference content for the Legend page (docs/epics/19-legend-
// walkthrough-reference.md). Since Epic 21 every label, status rule, and
// ledger entry name here is read from the same definitions the rest of the
// app renders with (stock-status.ts and each feature's labels.ts), instead
// of a hand-copied duplicate — so this page can't drift from what the
// screens actually show.
const STOCK_STATUS_RULES: Record<(typeof STOCK_STATUSES)[number], string> = {
  NEGATIVE: "Recorded balance is below zero.",
  OUT_OF_STOCK: "Recorded balance is exactly 0.",
  CRITICAL: `Below ${CRITICAL_RATIO * 100}% of the product's low-stock alert level.`,
  LOW: `At least ${CRITICAL_RATIO * 100}% but below 100% of the alert level.`,
  HEALTHY: `Between 100% and ${OVERSTOCKED_RATIO * 100}% of the alert level.`,
  OVERSTOCKED: `More than ${OVERSTOCKED_RATIO * 100}% of the alert level.`,
  UNTRACKED: "In stock, but the product has no low-stock alert level set.",
};

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
          <DefinitionRow term="Opening">
            Quantity on hand at the start of the period, worked back from the
            closing figure and every movement in the period.
          </DefinitionRow>
          <DefinitionRow term="Received">
            Stock accepted (finished goods) or materials received during the
            period.
          </DefinitionRow>
          <DefinitionRow term="Used / Sold">
            Raw materials used in production, or finished goods sold (net of any
            voided sales) during the period.
          </DefinitionRow>
          <DefinitionRow term="Count corrections">
            Changes from stock counts recorded during the period. Only shown
            when there are any.
          </DefinitionRow>
          <DefinitionRow term="Closing">
            Quantity on hand at the end of the period (right now, for the
            current period). Opening + Received − Used ± Count corrections =
            Closing on every row. Days, weeks and months follow Addis Ababa
            time.
          </DefinitionRow>
        </div>
      </section>

      <section id="sales" className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          2. Sales: cash vs on account, walk-in vs named customer
        </h2>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            Every sale is paid{" "}
            <ToneBadge tone={PAYMENT_TYPE_META.CASH.tone}>
              {PAYMENT_TYPE_META.CASH.label}
            </ToneBadge>{" "}
            or{" "}
            <ToneBadge tone={PAYMENT_TYPE_META.LOAN.tone}>
              {PAYMENT_TYPE_META.LOAN.label}
            </ToneBadge>
            . An on-account sale is paid for later: it first uses up any credit
            the customer already has with you, and only the rest is added to
            what they owe.
          </p>
          <p>
            A sale can be for a named customer (a standing account such as
            Merkato, Gondor, Moges, Mekele) or a{" "}
            <strong className="text-foreground">walk-in</strong> buyer with no
            account. Walk-in sales are always cash.
          </p>
          <p>
            If a sale would take a product's recorded stock below zero, the app
            asks you to confirm first. If the goods really are there, confirm,
            then record a stock count so the numbers match again.
          </p>
          <p>
            A mistaken sale is{" "}
            <strong className="text-foreground">voided</strong>, never deleted:
            it stays in the history marked "Voided", its stock goes back on
            hand, anything it added to the customer's account is taken off, and
            it no longer counts in totals or reports. To correct a sale, void it
            and record the right one.
          </p>
        </div>
      </section>

      <section id="loan-balance" className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          3. Customer balances
        </h2>
        <Card
          size="sm"
          className="border-l-2 border-l-(--color-status-warning)"
        >
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              Every customer balance is shown in words:{" "}
              <strong className="text-foreground">Owes you</strong> (they owe
              the business), <strong className="text-foreground">Credit</strong>{" "}
              (they paid in advance and the business owes them goods), or{" "}
              <strong className="text-foreground">Settled</strong>.
            </p>
            <p>
              In exported spreadsheets the balance is a plain number: positive
              means the customer owes you, negative means they have credit.
            </p>
          </CardContent>
        </Card>
        <div className="divide-y divide-border overflow-hidden rounded-xl ring-1 ring-foreground/10">
          {Object.values(LOAN_TRANSACTION_META).map((meta) => (
            <DefinitionRow
              key={meta.label}
              term={<ToneBadge tone={meta.tone}>{meta.label}</ToneBadge>}
            >
              {meta.description}
            </DefinitionRow>
          ))}
        </div>
      </section>

      <section id="ledger-entries" className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          4. Stock history entries
        </h2>
        <p className="text-sm text-muted-foreground">
          Finished goods and raw materials each keep a running balance plus a
          history of every movement that produced it. A history entry is never
          edited or deleted — corrections are new entries.
        </p>
        <div className="divide-y divide-border overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <DefinitionRow
            term={
              <span className="flex flex-wrap gap-1">
                <ToneBadge tone={STOCK_ENTRY_META.ACCEPT.tone}>
                  {STOCK_ENTRY_META.ACCEPT.label}
                </ToneBadge>
                <ToneBadge tone={MATERIAL_ENTRY_META.RECEIVED.tone}>
                  {MATERIAL_ENTRY_META.RECEIVED.label}
                </ToneBadge>
              </span>
            }
          >
            Candles accepted from production, or raw material received.
          </DefinitionRow>
          <DefinitionRow
            term={
              <span className="flex flex-wrap gap-1">
                <ToneBadge tone={STOCK_ENTRY_META.SALE.tone}>
                  {STOCK_ENTRY_META.SALE.label}
                </ToneBadge>
                <ToneBadge tone={MATERIAL_ENTRY_META.CONSUMED.tone}>
                  {MATERIAL_ENTRY_META.CONSUMED.label}
                </ToneBadge>
              </span>
            }
          >
            Candles went out in a sale, or raw material was used in production.
          </DefinitionRow>
          <DefinitionRow
            term={
              <ToneBadge tone={STOCK_ENTRY_META.ADJUSTMENT.tone}>
                {STOCK_ENTRY_META.ADJUSTMENT.label}
              </ToneBadge>
            }
          >
            A Manager recorded a physical count; the entry is the difference
            from what was recorded, with the reason.
          </DefinitionRow>
          <DefinitionRow
            term={
              <ToneBadge tone={STOCK_ENTRY_META.SALE_VOID.tone}>
                {STOCK_ENTRY_META.SALE_VOID.label}
              </ToneBadge>
            }
          >
            A sale was voided, so its quantity went back on hand.
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
          6. Stock statuses
        </h2>
        <p className="text-sm text-muted-foreground">
          Every screen that shows stock (Dashboard, Stock, Products, Analytics →
          Stock health) uses the same statuses, based on what is on hand
          compared with the product's own low-stock alert level (set on the
          product's Details tab):
        </p>
        <div className="flex flex-col gap-2">
          {STOCK_STATUSES.map((status) => {
            const meta = STOCK_STATUS_META[status];
            const Icon = meta.icon;
            return (
              <Card key={status} size="sm">
                <CardContent className="flex items-start gap-3">
                  <Icon
                    weight="fill"
                    className="mt-0.5 size-5 shrink-0"
                    style={{ color: ToneColor(meta.tone) }}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">
                      {meta.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {STOCK_STATUS_RULES[status]} {meta.description}
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
        <p className="text-sm text-muted-foreground">
          These are the default roles. A Manager can turn individual features on
          or off per role under Roles, and the sidebar always shows each person
          exactly the pages their role can open.
        </p>
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
                  Stock counts, voiding sales, and correcting customer balances.
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
                <li>Accept stock and record sales (cash or on account).</li>
                <li>
                  Record raw material activity (Received/Consumed) against the
                  catalog a Manager maintains.
                </li>
                <li>
                  View customers and record their payments — day-to-day account
                  activity, not corrections.
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
