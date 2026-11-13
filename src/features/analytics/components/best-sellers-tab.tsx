"use client";

import { TrendDownIcon, TrendUpIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { ExportMenu } from "@/components/ui/export-menu";
import { CardSkeleton } from "@/components/ui/skeleton";
import { type DateRangeValue, ResolveDateRange } from "@/lib/date-range";
import type { ExportColumn } from "@/lib/export/export-column";
import { FormatKg, FormatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useBestSellers } from "../hooks/use-analytics";
import type { BestSellerRowDTO } from "../validators/analytics.schema";
import { RankedBarChart, type RankedBarDatum } from "./ranked-bar-chart";

function TrendIndicator({
  current,
  prior,
}: {
  current: number;
  prior: number;
}) {
  if (prior === 0) {
    return <span className="text-xs text-muted-foreground">New</span>;
  }

  const changePercent = ((current - prior) / prior) * 100;
  const isUp = changePercent >= 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 tabular-nums",
        isUp ? "text-[var(--color-status-good)]" : "text-destructive",
      )}
    >
      {isUp ? <TrendUpIcon /> : <TrendDownIcon />}
      {Math.abs(changePercent).toFixed(0)}%
    </span>
  );
}

function BuildColumns(
  valueKey: "unitsSoldKg" | "revenue",
  priorKey: "priorUnitsSoldKg" | "priorRevenue",
  valueHeader: string,
): DataTableColumn<BestSellerRowDTO>[] {
  return [
    {
      key: "name",
      header: "Product",
      cell: (row) => (
        <Link
          href={`/manager/products/${row.productId}`}
          className="underline-offset-4 hover:underline"
        >
          {row.productName}{" "}
          <span className="text-muted-foreground">{row.productSku}</span>
        </Link>
      ),
    },
    { key: "category", header: "Category", cell: (row) => row.categoryName },
    {
      key: "value",
      header: valueHeader,
      cell: (row) =>
        valueKey === "revenue"
          ? FormatMoney(row.revenue)
          : FormatKg(row.unitsSoldKg),
      className: "text-right tabular-nums",
    },
    {
      key: "trend",
      header: "vs. prior period",
      cell: (row) => (
        <TrendIndicator
          current={Number(row[valueKey])}
          prior={Number(row[priorKey])}
        />
      ),
    },
  ];
}

const quantityColumns = BuildColumns("unitsSoldKg", "priorUnitsSoldKg", "Sold");
const revenueColumns = BuildColumns("revenue", "priorRevenue", "Revenue");

function FormatTrendValue(current: number, prior: number): string {
  if (prior === 0) return "—";
  const changePercent = ((current - prior) / prior) * 100;
  return `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(0)}%`;
}

function BuildExportColumns(
  valueKey: "unitsSoldKg" | "revenue",
  priorKey: "priorUnitsSoldKg" | "priorRevenue",
  valueHeader: string,
): ExportColumn<BestSellerRowDTO>[] {
  return [
    {
      header: "Product",
      value: (row) => `${row.productName} (${row.productSku})`,
    },
    { header: "Category", value: (row) => row.categoryName },
    { header: valueHeader, value: (row) => row[valueKey] },
    {
      header: "vs. prior period",
      value: (row) =>
        FormatTrendValue(Number(row[valueKey]), Number(row[priorKey])),
    },
  ];
}

const quantityExportColumns = BuildExportColumns(
  "unitsSoldKg",
  "priorUnitsSoldKg",
  "Units sold (kg)",
);
const revenueExportColumns = BuildExportColumns(
  "revenue",
  "priorRevenue",
  "Revenue",
);

export function BestSellersTab() {
  const [range, setRange] = useState<DateRangeValue>({ preset: "7d" });
  const { data, isLoading } = useBestSellers(ResolveDateRange(range), true);

  const quantityChartData: RankedBarDatum[] = (data?.byQuantity ?? []).map(
    (row) => ({
      key: row.productId,
      label: row.productName,
      value: Number(row.unitsSoldKg),
      color: "var(--color-chart-series-1)",
    }),
  );
  const revenueChartData: RankedBarDatum[] = (data?.byRevenue ?? []).map(
    (row) => ({
      key: row.productId,
      label: row.productName,
      value: Number(row.revenue),
      color: "var(--color-chart-series-2)",
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Top products for the period, compared with the same number of days
          just before it.
        </p>
        <DateRangeFilter
          value={range}
          onChange={setRange}
          presets={["7d", "30d", "month", "last-month", "90d", "year"]}
          className="w-56"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Ranked by quantity</h3>
          {data && (
            <ExportMenu
              filename="best-sellers-quantity"
              title="Best Sellers — by quantity"
              columns={quantityExportColumns}
              rows={data.byQuantity}
            />
          )}
        </div>
        {isLoading || !data ? (
          <CardSkeleton />
        ) : (
          <RankedBarChart data={quantityChartData} valueFormatter={FormatKg} />
        )}
        {isLoading || !data ? (
          <TableSkeleton columns={quantityColumns.length} />
        ) : (
          <DataTable
            clientPageSize={20}
            columns={quantityColumns}
            data={data.byQuantity}
            getRowKey={(row) => row.productId}
            emptyMessage="No sales in this window."
          />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Ranked by revenue</h3>
          {data && (
            <ExportMenu
              filename="best-sellers-revenue"
              title="Best Sellers — by revenue"
              columns={revenueExportColumns}
              rows={data.byRevenue}
            />
          )}
        </div>
        {isLoading || !data ? (
          <CardSkeleton />
        ) : (
          <RankedBarChart
            data={revenueChartData}
            valueFormatter={FormatMoney}
          />
        )}
        {isLoading || !data ? (
          <TableSkeleton columns={revenueColumns.length} />
        ) : (
          <DataTable
            clientPageSize={20}
            columns={revenueColumns}
            data={data.byRevenue}
            getRowKey={(row) => row.productId}
            emptyMessage="No sales in this window."
          />
        )}
      </div>
    </div>
  );
}
