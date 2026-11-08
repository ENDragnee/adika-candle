"use client";

import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  StackIcon,
  WarningIcon,
  WarningOctagonIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardSkeleton } from "@/components/ui/skeleton";
import { useStockHealth } from "../hooks/use-analytics";
import type {
  StockHealthRowDTO,
  StockHealthStatus,
} from "../validators/analytics.schema";
import { RankedBarChart, type RankedBarDatum } from "./ranked-bar-chart";

// Icon + label + color per status — never color alone, per the dataviz
// skill's status-palette mitigation. Colors map to the --status-* tokens
// in globals.css (Epic 17 decisions in docs/DECISIONS.md); naming note:
// the StockHealthStatus "CRITICAL" bucket intentionally maps to the
// --status-serious token, since Out of stock (not Critical) is this
// report's most severe state and claims --status-critical.
const STATUS_META: Record<
  StockHealthStatus,
  { label: string; icon: typeof CheckCircleIcon; colorVar: string }
> = {
  OUT_OF_STOCK: {
    label: "Out of stock",
    icon: XCircleIcon,
    colorVar: "var(--color-status-critical)",
  },
  CRITICAL: {
    label: "Critical",
    icon: WarningOctagonIcon,
    colorVar: "var(--color-status-serious)",
  },
  LOW: {
    label: "Low",
    icon: WarningIcon,
    colorVar: "var(--color-status-warning)",
  },
  HEALTHY: {
    label: "Healthy",
    icon: CheckCircleIcon,
    colorVar: "var(--color-status-good)",
  },
  OVERSTOCKED: {
    label: "Overstocked",
    icon: StackIcon,
    colorVar: "var(--color-status-info)",
  },
};

const STATUS_FILTER_OPTIONS: {
  value: StockHealthStatus | "ALL";
  label: string;
}[] = [
  { value: "ALL", label: "All statuses" },
  { value: "OUT_OF_STOCK", label: "Out of stock" },
  { value: "CRITICAL", label: "Critical" },
  { value: "LOW", label: "Low" },
  { value: "HEALTHY", label: "Healthy" },
  { value: "OVERSTOCKED", label: "Overstocked" },
];

type SortKey = "quantityKg" | "daysOfCover" | "productName";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "productName", label: "Name" },
  { value: "quantityKg", label: "Quantity" },
  { value: "daysOfCover", label: "Days of cover" },
];

function StatusBadge({ status }: { status: StockHealthStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <Badge
      style={{
        backgroundColor: `color-mix(in oklab, ${meta.colorVar} 15%, transparent)`,
        color: meta.colorVar,
      }}
    >
      <Icon data-icon="inline-start" />
      {meta.label}
    </Badge>
  );
}

const columns: DataTableColumn<StockHealthRowDTO>[] = [
  {
    key: "name",
    header: "Product",
    cell: (row) => `${row.productName} (${row.productSku})`,
  },
  { key: "quantity", header: "On hand (kg)", cell: (row) => row.quantityKg },
  {
    key: "threshold",
    header: "Threshold (kg)",
    cell: (row) => row.thresholdKg ?? "—",
    className: "text-muted-foreground",
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: "velocity",
    header: "Avg. daily sales (kg)",
    cell: (row) => row.averageDailySalesKg,
    className: "text-muted-foreground",
  },
  {
    key: "cover",
    header: "Days of cover",
    cell: (row) => row.daysOfCover ?? "—",
    className: "text-muted-foreground",
  },
];

export function StockHealthTab() {
  const { data, isLoading } = useStockHealth(true);
  const [statusFilter, setStatusFilter] = useState<StockHealthStatus | "ALL">(
    "ALL",
  );
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("productName");
  const [descending, setDescending] = useState(false);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    const rows = data.rows.filter((row) => {
      const matchesStatus =
        statusFilter === "ALL" || row.status === statusFilter;
      const matchesSearch =
        !query || row.productName.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });

    rows.sort((a, b) => {
      let diff: number;
      if (sortKey === "productName") {
        diff = a.productName.localeCompare(b.productName);
      } else {
        diff = Number(a[sortKey] ?? 0) - Number(b[sortKey] ?? 0);
      }
      return descending ? -diff : diff;
    });

    return rows;
  }, [data, statusFilter, search, sortKey, descending]);

  const distributionData: RankedBarDatum[] = (data?.distribution ?? []).map(
    (bucket) => ({
      key: bucket.status,
      label: STATUS_META[bucket.status].label,
      value: bucket.count,
      color: STATUS_META[bucket.status].colorVar,
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-medium">Stock Health</h2>
        <p className="text-xs text-muted-foreground">
          Every active product bucketed by on-hand quantity vs. its low-stock
          threshold, plus an estimate of days of cover from the trailing 30-day
          sale velocity.
        </p>
      </div>

      {isLoading || !data ? (
        <CardSkeleton />
      ) : (
        <RankedBarChart data={distributionData} />
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Products</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search product…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-40 pl-7"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as StockHealthStatus | "ALL")
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sortKey}
              onValueChange={(value) => setSortKey(value as SortKey)}
            >
              <SelectTrigger className="w-36">
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
            data={filteredRows}
            getRowKey={(row) => row.productId}
            emptyMessage="No products match this filter."
          />
        )}
      </div>
    </div>
  );
}
