"use client";

import { SortAscendingIcon, SortDescendingIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardSkeleton } from "@/components/ui/skeleton";
import { useProfitability } from "../hooks/use-analytics";
import type { ProductMarginRowDTO } from "../validators/analytics.schema";
import { StatTile } from "./stat-tile";
import { TrendLineChart } from "./trend-line-chart";

const WINDOW_DAYS = 30;

type SortKey = "marginPercent" | "unitsSoldKg" | "totalProfit";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "totalProfit", label: "Total profit" },
  { value: "marginPercent", label: "Margin %" },
  { value: "unitsSoldKg", label: "Units sold" },
];

const columns: DataTableColumn<ProductMarginRowDTO>[] = [
  {
    key: "name",
    header: "Product",
    cell: (row) => `${row.productName} (${row.productSku})`,
  },
  {
    key: "price",
    header: "Sell price / kg",
    cell: (row) => row.sellPricePerKg ?? "—",
  },
  { key: "cost", header: "Cost / kg", cell: (row) => row.costPerKg ?? "—" },
  {
    key: "margin",
    header: "Margin %",
    cell: (row) => (row.marginPercent ? `${row.marginPercent}%` : "—"),
  },
  { key: "units", header: "Units sold (kg)", cell: (row) => row.unitsSoldKg },
  { key: "profit", header: "Total profit", cell: (row) => row.totalProfit },
];

export function ProfitabilityTab() {
  const { data, isLoading } = useProfitability(WINDOW_DAYS, true);
  const [sortKey, setSortKey] = useState<SortKey>("totalProfit");
  const [descending, setDescending] = useState(true);

  const sortedProducts = useMemo(() => {
    if (!data) return [];
    const rows = [...data.products];
    rows.sort((a, b) => {
      const diff = Number(a[sortKey] ?? 0) - Number(b[sortKey] ?? 0);
      return descending ? -diff : diff;
    });
    return rows;
  }, [data, sortKey, descending]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-medium">Profitability</h2>
        <p className="text-xs text-muted-foreground">
          Last {WINDOW_DAYS} days.
        </p>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Total revenue"
              value={Number(data.stats.totalRevenue)}
            />
            <StatTile label="Total cost" value={Number(data.stats.totalCost)} />
            <StatTile
              label="Total profit"
              value={Number(data.stats.totalProfit)}
            />
            <StatTile
              label="Average margin"
              value={Number(data.stats.averageMarginPercent)}
              format={(value) => `${value.toFixed(1)}%`}
            />
          </div>
          {data.stats.excludedSaleCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {data.stats.excludedSaleCount} sale
              {data.stats.excludedSaleCount === 1 ? "" : "s"} in this window had
              no cost on record (recorded before Epic 15) and are excluded from
              the cost/profit totals above — revenue still includes them, so
              margin figures are partial for this window.
            </p>
          )}
        </div>
      )}

      {isLoading || !data ? (
        <CardSkeleton />
      ) : (
        <TrendLineChart
          points={data.trend.map((point) => ({
            label: point.date,
            values: { margin: Number(point.marginPercent) },
          }))}
          series={[
            {
              key: "margin",
              label: "Margin %",
              color: "var(--color-chart-series-1)",
            },
          ]}
          valueFormatter={(value) => `${value.toFixed(1)}%`}
        />
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Per-product margin</h3>
          <div className="flex items-center gap-2">
            <Select
              value={sortKey}
              onValueChange={(value) => setSortKey(value as SortKey)}
            >
              <SelectTrigger className="w-40">
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
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={descending ? "Sort ascending" : "Sort descending"}
              onClick={() => setDescending((value) => !value)}
            >
              {descending ? <SortDescendingIcon /> : <SortAscendingIcon />}
            </Button>
          </div>
        </div>
        {isLoading || !data ? (
          <TableSkeleton columns={columns.length} />
        ) : (
          <DataTable
            columns={columns}
            data={sortedProducts}
            getRowKey={(row) => row.productId}
            emptyMessage="No sales in this window."
          />
        )}
      </div>
    </div>
  );
}
