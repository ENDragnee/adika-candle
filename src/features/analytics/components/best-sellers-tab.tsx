"use client";

import { TrendDownIcon, TrendUpIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { CardSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBestSellers } from "../hooks/use-analytics";
import type { BestSellerRowDTO } from "../validators/analytics.schema";
import { RankedBarChart, type RankedBarDatum } from "./ranked-bar-chart";

const PERIOD_PRESETS = [
  { label: "Day", days: 1 },
  { label: "Week", days: 7 },
  { label: "Month", days: 30 },
] as const;

function TrendIndicator({
  current,
  prior,
}: {
  current: number;
  prior: number;
}) {
  if (prior === 0) {
    return <span className="text-muted-foreground">—</span>;
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
      cell: (row) => `${row.productName} (${row.productSku})`,
    },
    { key: "category", header: "Category", cell: (row) => row.categoryName },
    { key: "value", header: valueHeader, cell: (row) => row[valueKey] },
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

const quantityColumns = BuildColumns(
  "unitsSoldKg",
  "priorUnitsSoldKg",
  "Units sold (kg)",
);
const revenueColumns = BuildColumns("revenue", "priorRevenue", "Revenue");

export function BestSellersTab() {
  const [days, setDays] = useState<number>(7);
  const [customDays, setCustomDays] = useState("");
  const { data, isLoading } = useBestSellers(days, true);

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
        <div>
          <h2 className="text-sm font-medium">Best Sellers</h2>
          <p className="text-xs text-muted-foreground">
            Last {days} day{days === 1 ? "" : "s"}, vs. the equivalent prior
            period.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {PERIOD_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              size="sm"
              variant={days === preset.days ? "default" : "outline"}
              onClick={() => {
                setDays(preset.days);
                setCustomDays("");
              }}
            >
              {preset.label}
            </Button>
          ))}
          <Input
            type="number"
            min="1"
            placeholder="Custom days"
            className="w-28"
            value={customDays}
            onChange={(event) => {
              const next = event.target.value;
              setCustomDays(next);
              const parsed = Number(next);
              if (parsed > 0) setDays(parsed);
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Ranked by quantity</h3>
        {isLoading || !data ? (
          <CardSkeleton />
        ) : (
          <RankedBarChart
            data={quantityChartData}
            valueFormatter={(value) => `${value.toFixed(1)} kg`}
          />
        )}
        {isLoading || !data ? (
          <TableSkeleton columns={quantityColumns.length} />
        ) : (
          <DataTable
            columns={quantityColumns}
            data={data.byQuantity}
            getRowKey={(row) => row.productId}
            emptyMessage="No sales in this window."
          />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Ranked by revenue</h3>
        {isLoading || !data ? (
          <CardSkeleton />
        ) : (
          <RankedBarChart data={revenueChartData} />
        )}
        {isLoading || !data ? (
          <TableSkeleton columns={revenueColumns.length} />
        ) : (
          <DataTable
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
