"use client";

import {
  ArrowRightIcon,
  BellRingingIcon,
  CalendarBlankIcon,
  HandCoinsIcon,
  ReceiptIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { StockStatusStrip } from "@/features/stock/components/stock-status-strip";
import {
  DescribeLoanBalance,
  FormatCompactNumber,
  FormatDateKey,
  FormatMoney,
  FormatRelative,
  Pluralize,
} from "@/lib/format";
import { useManagerDashboard } from "../hooks/use-analytics";
import type { ManagerDashboardDTO } from "../validators/analytics.schema";
import { AttentionList } from "./attention-list";
import { SalesTrendChartSkeleton, StackedBarChart } from "./sales-trend-chart";
import { StatTile } from "./stat-tile";

const ATTENTION_PREVIEW_LIMIT = 6;

function ViewAllLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      {children}
      <ArrowRightIcon className="size-3" />
    </Link>
  );
}

function DebtorList({
  debtors,
}: {
  debtors: ManagerDashboardDTO["topDebtors"];
}) {
  if (debtors.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No customer owes you anything right now.
      </p>
    );
  }
  const largest = Number(debtors[0].balance);
  return (
    <ul className="flex flex-col gap-3">
      {debtors.map((debtor) => {
        const amount = Number(debtor.balance);
        return (
          <li key={debtor.accountId} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <Link
                href={`/manager/customers/${debtor.customerId}`}
                className="truncate font-medium underline-offset-4 hover:underline"
              >
                {debtor.customerName}
              </Link>
              <span className="shrink-0 font-semibold tabular-nums">
                {FormatMoney(debtor.balance)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-sm bg-muted">
              <div
                className="h-full rounded-sm bg-chart-series-1"
                style={{ width: `${(amount / largest) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {debtor.lastPaymentAt
                ? `Last paid ${FormatRelative(debtor.lastPaymentAt)}`
                : "No payment yet"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SalesTrendChartSkeleton />
        </div>
        <div className="flex flex-col gap-2 lg:col-span-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}

// The Manager's landing page (rebuilt in Epic 21) answers, in order:
// how is today going, what needs my attention, how are sales trending,
// where does stock stand, and who owes us money. Every block links to the
// page where the detail lives or the problem gets fixed.
export function ManagerDashboard() {
  const { data, isLoading } = useManagerDashboard();

  if (isLoading || !data) return <DashboardSkeleton />;

  const { today, receivables } = data;
  const urgentCount = data.attention.filter(
    (item) => item.severity === "critical",
  ).length;
  const credit = DescribeLoanBalance(`-${receivables.customerCredit}`);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={ReceiptIcon}
          label="Today's sales"
          value={Number(today.salesAmount)}
          format={FormatMoney}
          delta={{
            previous: Number(today.yesterdaySalesAmount),
            label: "yesterday",
          }}
          hint={
            today.saleCount > 0
              ? `${Pluralize(today.saleCount, "sale")} · ${FormatMoney(today.cashAmount)} cash`
              : "No sales recorded yet today"
          }
          href="/manager/sales?range=today"
        />
        <StatTile
          icon={CalendarBlankIcon}
          label="Last 30 days"
          value={Number(data.salesTotalLast30Days)}
          format={FormatMoney}
          delta={{
            previous: Number(data.salesTotalPrior30Days),
            label: "the previous 30 days",
          }}
          href="/manager/analytics?tab=profitability"
        />
        <StatTile
          icon={HandCoinsIcon}
          label="Customers owe you"
          value={Number(receivables.owedToUs)}
          format={FormatMoney}
          hint={
            receivables.creditCount > 0
              ? `${Pluralize(receivables.debtorCount, "customer")} · you hold ${credit.amount} credit`
              : Pluralize(receivables.debtorCount, "customer")
          }
          href="/manager/loans"
        />
        <StatTile
          icon={BellRingingIcon}
          label="Needs attention"
          value={data.attention.length}
          format={(value) => Math.round(value).toString()}
          hint={
            data.attention.length === 0
              ? "All clear"
              : urgentCount > 0
                ? `${urgentCount} urgent`
                : "Nothing urgent"
          }
          href="#attention"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <Section
          className="lg:col-span-3"
          title="Sales, last 30 days"
          description="Daily totals, split into cash and on-account sales."
          actions={<ViewAllLink href="/manager/sales">All sales</ViewAllLink>}
        >
          <Card>
            <CardContent>
              <StackedBarChart
                points={data.salesTrend.map((point) => ({
                  key: point.date,
                  label: FormatDateKey(point.date),
                  values: {
                    cash: Number(point.cashAmount),
                    onAccount: Number(point.onAccountAmount),
                  },
                  detail: Pluralize(point.saleCount, "sale"),
                }))}
                series={[
                  {
                    key: "cash",
                    label: "Cash",
                    color: "var(--color-chart-series-1)",
                  },
                  {
                    key: "onAccount",
                    label: "On account",
                    color: "var(--color-chart-series-2)",
                  },
                ]}
                valueFormatter={FormatMoney}
                axisFormatter={FormatCompactNumber}
                emptyMessage="No sales in the last 30 days."
              />
            </CardContent>
          </Card>
        </Section>

        <Section
          id="attention"
          className="lg:col-span-2"
          title="Needs attention"
          description="Most urgent first. Each item links to where it gets fixed."
          actions={
            data.attention.length > ATTENTION_PREVIEW_LIMIT ? (
              <span className="text-xs text-muted-foreground">
                {data.attention.length} items
              </span>
            ) : undefined
          }
        >
          <div className="max-h-[22rem] overflow-y-auto rounded-xl">
            <AttentionList items={data.attention} />
          </div>
        </Section>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <Section
          className="lg:col-span-3"
          title="Stock status"
          description="Every active product. Click a status to see which ones."
          actions={
            <ViewAllLink href="/manager/analytics?tab=stock-health">
              Stock health
            </ViewAllLink>
          }
        >
          <Card>
            <CardContent>
              <StockStatusStrip
                counts={data.stockDistribution}
                hideEmpty
                hrefFor={(status) =>
                  `/manager/analytics?tab=stock-health&status=${status}`
                }
              />
            </CardContent>
          </Card>
        </Section>

        <Section
          className="lg:col-span-2"
          title="Biggest balances owed"
          actions={
            <ViewAllLink href="/manager/loans">All accounts</ViewAllLink>
          }
        >
          <Card>
            <CardContent>
              <DebtorList debtors={data.topDebtors} />
            </CardContent>
          </Card>
        </Section>
      </div>
    </div>
  );
}
