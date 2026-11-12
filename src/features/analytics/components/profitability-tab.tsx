"use client";

import {
  CoinsIcon,
  PercentIcon,
  ReceiptIcon,
  TrendUpIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { Section } from "@/components/ui/section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardSkeleton } from "@/components/ui/skeleton";
import type { ExportColumn } from "@/lib/export/export-column";
import {
  FormatCompactNumber,
  FormatDateKey,
  FormatKg,
  FormatMoney,
  FormatPercent,
  Pluralize,
} from "@/lib/format";
import { useProfitability } from "../hooks/use-analytics";
import type { ProductMarginRowDTO } from "../validators/analytics.schema";
import { StatTile } from "./stat-tile";
import { TrendLineChart } from "./trend-line-chart";

const WINDOW_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

type SortKey = "totalProfit" | "realizedMarginPercent" | "revenue";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "totalProfit", label: "Sort by profit" },
  { value: "realizedMarginPercent", label: "Sort by margin" },
  { value: "revenue", label: "Sort by revenue" },
];

// A margin cell with a small bar, so the table reads as a ranking at a
// glance. Negative margins (selling below cost) get the critical color.
function MarginCell({ value }: { value: string | null }) {
  if (value === null) {
    return <span className="text-muted-foreground">No cost data</span>;
  }
  const number = Number(value);
  const width = Math.min(Math.abs(number), 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-right tabular-nums">
        {FormatPercent(number)}
      </span>
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${width}%`,
            backgroundColor:
              number < 0
                ? "var(--color-status-critical)"
                : "var(--color-chart-series-1)",
          }}
        />
      </span>
    </div>
  );
}

const columns: DataTableColumn<ProductMarginRowDTO>[] = [
  {
    key: "name",
    header: "Product",
    cell: (row) => (
      <span className="flex items-center gap-1.5">
        <Link
          href={`/manager/products/${row.productId}`}
          className="underline-offset-4 hover:underline"
        >
          {row.productName}
        </Link>
        {row.uncostedSaleCount > 0 && (
          <WarningIcon
            className="size-3.5"
            style={{ color: "var(--color-status-warning)" }}
            aria-label={`${Pluralize(row.uncostedSaleCount, "sale")} without cost data`}
          >
            <title>
              {Pluralize(row.uncostedSaleCount, "sale")} had no cost on record
              and are left out of profit and margin
            </title>
          </WarningIcon>
        )}
      </span>
    ),
  },
  {
    key: "revenue",
    header: "Revenue",
    cell: (row) => FormatMoney(row.revenue),
    className: "text-right tabular-nums",
  },
  {
    key: "units",
    header: "Sold",
    cell: (row) => FormatKg(row.unitsSoldKg),
    className: "text-right tabular-nums",
  },
  {
    key: "profit",
    header: "Profit",
    cell: (row) => FormatMoney(row.totalProfit),
    className: "text-right font-medium tabular-nums",
  },
  {
    key: "margin",
    header: "Margin (actual)",
    cell: (row) => <MarginCell value={row.realizedMarginPercent} />,
  },
  {
    key: "current",
    header: "Today's price / cost",
    cell: (row) => (
      <span className="text-muted-foreground tabular-nums">
        {FormatMoney(row.currentPricePerKg)} /{" "}
        {FormatMoney(row.currentCostPerKg)}
        {row.currentMarginPercent !== null &&
          ` · ${FormatPercent(row.currentMarginPercent)}`}
      </span>
    ),
  },
];

const exportColumns: ExportColumn<ProductMarginRowDTO>[] = [
  { header: "Product", value: (row) => row.productName },
  { header: "SKU", value: (row) => row.productSku },
  { header: "Revenue", value: (row) => row.revenue },
  { header: "Sold (kg)", value: (row) => row.unitsSoldKg },
  { header: "Profit", value: (row) => row.totalProfit ?? "" },
  {
    header: "Actual margin %",
    value: (row) => row.realizedMarginPercent ?? "",
  },
  { header: "Current price / kg", value: (row) => row.currentPricePerKg ?? "" },
  { header: "Current cost / kg", value: (row) => row.currentCostPerKg ?? "" },
  {
    header: "Current margin %",
    value: (row) => row.currentMarginPercent ?? "",
  },
  {
    header: "Sales without cost",
    value: (row) => String(row.uncostedSaleCount),
  },
];

function NullableNumber(value: string | null) {
  return value === null ? null : Number(value);
}

export function ProfitabilityTab() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useProfitability(days, true);
  const [sortKey, setSortKey] = useState<SortKey>("totalProfit");

  const sortedProducts = useMemo(() => {
    if (!data) return [];
    // Rows with no figure sort last regardless of direction.
    return [...data.products].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      if (left === null) return 1;
      if (right === null) return -1;
      return Number(right) - Number(left);
    });
  }, [data, sortKey]);

  const coverage =
    data && Number(data.stats.totalRevenue) > 0
      ? (Number(data.stats.costedRevenue) / Number(data.stats.totalRevenue)) *
        100
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Profit = what customers paid − what the goods cost to make, using the
          cost on record when each sale happened.
        </p>
        <Select
          value={String(days)}
          onValueChange={(value) => setDays(Number(value))}
        >
          <SelectTrigger className="w-40" aria-label="Period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WINDOW_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              icon={ReceiptIcon}
              label="Revenue"
              value={Number(data.stats.totalRevenue)}
              format={FormatMoney}
              hint={Pluralize(
                data.stats.includedSaleCount + data.stats.excludedSaleCount,
                "sale",
              )}
            />
            <StatTile
              icon={CoinsIcon}
              label="Cost of goods sold"
              value={
                data.stats.includedSaleCount > 0
                  ? Number(data.stats.totalCost)
                  : null
              }
              format={FormatMoney}
              hint="For sales with a cost on record"
            />
            <StatTile
              icon={TrendUpIcon}
              label="Profit"
              value={NullableNumber(data.stats.totalProfit)}
              format={FormatMoney}
              hint={
                data.stats.totalProfit === null
                  ? "No cost data for this period"
                  : undefined
              }
            />
            <StatTile
              icon={PercentIcon}
              label="Margin"
              value={NullableNumber(data.stats.averageMarginPercent)}
              format={(value) => FormatPercent(value)}
              hint={
                data.stats.averageMarginPercent === null
                  ? "Set product costs to see margin"
                  : "Profit ÷ revenue"
              }
            />
          </div>
          {coverage !== null && coverage < 100 && (
            <div className="flex flex-col gap-1.5 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <WarningIcon
                    weight="fill"
                    style={{ color: "var(--color-status-warning)" }}
                  />
                  Cost data covers{" "}
                  {FormatPercent(coverage, { fractionDigits: 0 })} of revenue
                </span>
                <Link
                  href="/manager/products"
                  className="text-xs font-medium underline-offset-4 hover:underline"
                >
                  Set product costs
                </Link>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-chart-series-1"
                  style={{ width: `${coverage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {Pluralize(data.stats.excludedSaleCount, "sale")} had no cost
                set when they were recorded, so they count toward revenue but
                are left out of profit and margin.
              </p>
            </div>
          )}
        </div>
      )}

      <Section
        title="Daily margin"
        description="Gaps are days with no sales that had a cost on record."
      >
        {isLoading || !data ? (
          <CardSkeleton />
        ) : (
          <TrendLineChart
            points={data.trend.map((point) => ({
              key: point.date,
              label: FormatDateKey(point.date),
              values: { margin: NullableNumber(point.marginPercent) },
            }))}
            series={[
              {
                key: "margin",
                label: "Margin",
                color: "var(--color-chart-series-1)",
              },
            ]}
            valueFormatter={(value) => FormatPercent(value)}
            axisFormatter={(value) => `${FormatCompactNumber(value)}%`}
            emptyMessage="No sales with cost data in this period."
          />
        )}
      </Section>

      <Section
        title="By product"
        description="Actual margin uses each sale's recorded price and cost. Today's price / cost shows what a sale made now would earn."
        actions={
          <>
            {data && (
              <ExportMenu
                filename="profitability"
                title={`Profitability — last ${days} days`}
                columns={exportColumns}
                rows={sortedProducts}
              />
            )}
            <Select
              value={sortKey}
              onValueChange={(value) => setSortKey(value as SortKey)}
            >
              <SelectTrigger className="w-40" aria-label="Sort products">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      >
        {isLoading || !data ? (
          <TableSkeleton columns={columns.length} />
        ) : (
          <DataTable
            clientPageSize={20}
            columns={columns}
            data={sortedProducts}
            getRowKey={(row) => row.productId}
            emptyMessage="No sales in this period."
          />
        )}
      </Section>
    </div>
  );
}
