"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { Input } from "@/components/ui/input";
import { Section } from "@/components/ui/section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardSkeleton } from "@/components/ui/skeleton";
import {
  STOCK_STATUS_META,
  StockStatusBadge,
} from "@/features/stock/components/stock-status-badge";
import { StockStatusStrip } from "@/features/stock/components/stock-status-strip";
import {
  ATTENTION_STOCK_STATUSES,
  STOCK_STATUSES,
  type StockStatus,
} from "@/features/stock/stock-status";
import type { ExportColumn } from "@/lib/export/export-column";
import { FormatKg, FormatNumber } from "@/lib/format";
import { useStockHealth } from "../hooks/use-analytics";
import type { StockHealthRowDTO } from "../validators/analytics.schema";

type SortKey = "urgency" | "daysOfCover" | "quantityKg" | "productName";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "urgency", label: "Most urgent first" },
  { value: "daysOfCover", label: "Fewest days left" },
  { value: "quantityKg", label: "Least on hand" },
  { value: "productName", label: "Name" },
];

// Fewer than this many days of stock left at the current sales pace is
// worth flagging even when the product is above its alert level.
const LOW_COVER_DAYS = 7;

const URGENCY = new Map(STOCK_STATUSES.map((status, index) => [status, index]));

function DaysOfCover({ value }: { value: string | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const days = Number(value);
  return (
    <span
      className="tabular-nums"
      style={
        days < LOW_COVER_DAYS
          ? { color: "var(--color-status-critical)", fontWeight: 600 }
          : undefined
      }
    >
      {FormatNumber(days, 1)} days
    </span>
  );
}

const columns: DataTableColumn<StockHealthRowDTO>[] = [
  {
    key: "name",
    header: "Product",
    cell: (row) => (
      <Link
        href={`/manager/stock/${row.productId}`}
        className="underline-offset-4 hover:underline"
      >
        {row.productName}{" "}
        <span className="text-muted-foreground">{row.productSku}</span>
      </Link>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <StockStatusBadge status={row.status} />,
  },
  {
    key: "quantity",
    header: "On hand",
    cell: (row) => FormatKg(row.quantityKg),
    className: "text-right tabular-nums",
  },
  {
    key: "threshold",
    header: "Alert level",
    cell: (row) =>
      row.thresholdKg === null ? "Not set" : FormatKg(row.thresholdKg),
    className: "text-right tabular-nums text-muted-foreground",
  },
  {
    key: "velocity",
    header: "Sells per day",
    cell: (row) =>
      Number(row.averageDailySalesKg) === 0
        ? "—"
        : FormatKg(row.averageDailySalesKg),
    className: "text-right tabular-nums text-muted-foreground",
  },
  {
    key: "cover",
    header: "Stock lasts",
    cell: (row) => <DaysOfCover value={row.daysOfCover} />,
    className: "text-right",
  },
];

const exportColumns: ExportColumn<StockHealthRowDTO>[] = [
  { header: "Product", value: (row) => row.productName },
  { header: "SKU", value: (row) => row.productSku },
  { header: "Status", value: (row) => STOCK_STATUS_META[row.status].label },
  { header: "On hand (kg)", value: (row) => row.quantityKg },
  { header: "Alert level (kg)", value: (row) => row.thresholdKg ?? "" },
  { header: "Sells per day (kg)", value: (row) => row.averageDailySalesKg },
  { header: "Days of stock left", value: (row) => row.daysOfCover ?? "" },
];

function InitialStatus(param: string | null): StockStatus | "ATTENTION" | null {
  if (param === "attention") return "ATTENTION";
  return STOCK_STATUSES.includes(param as StockStatus)
    ? (param as StockStatus)
    : null;
}

export function StockHealthTab() {
  const searchParams = useSearchParams();
  const { data, isLoading } = useStockHealth(true);
  // `?status=LOW` or `?status=attention` (every status that needs action)
  // pre-filters the table — the Dashboard links here that way.
  const [statusFilter, setStatusFilter] = useState<
    StockStatus | "ATTENTION" | null
  >(() => InitialStatus(searchParams.get("status")));
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("urgency");

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    const rows = data.rows.filter((row) => {
      const matchesStatus =
        statusFilter === null ||
        (statusFilter === "ATTENTION"
          ? ATTENTION_STOCK_STATUSES.includes(row.status)
          : row.status === statusFilter);
      const matchesSearch =
        !query ||
        row.productName.toLowerCase().includes(query) ||
        row.productSku.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });

    rows.sort((a, b) => {
      if (sortKey === "productName") {
        return a.productName.localeCompare(b.productName);
      }
      if (sortKey === "urgency") {
        return (
          (URGENCY.get(a.status) ?? 0) - (URGENCY.get(b.status) ?? 0) ||
          Number(a.quantityKg) - Number(b.quantityKg)
        );
      }
      // Rows with no figure sort last.
      const left = a[sortKey];
      const right = b[sortKey];
      if (left === null) return 1;
      if (right === null) return -1;
      return Number(left) - Number(right);
    });

    return rows;
  }, [data, statusFilter, search, sortKey]);

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Where stock stands"
        description={`Every active product, compared with its low-stock alert level. "Stock lasts" estimates days left at the last ${data?.windowDays ?? 30} days' sales pace. Click a status to filter.`}
      >
        {isLoading || !data ? (
          <CardSkeleton />
        ) : (
          <StockStatusStrip
            counts={data.distribution}
            selected={statusFilter === "ATTENTION" ? null : statusFilter}
            onSelect={setStatusFilter}
          />
        )}
      </Section>

      <Section
        title={
          statusFilter === "ATTENTION"
            ? "Products that need attention"
            : statusFilter
              ? `${STOCK_STATUS_META[statusFilter].label} products`
              : "All products"
        }
        actions={
          <>
            {data && (
              <ExportMenu
                filename="stock-health"
                title="Stock health"
                columns={exportColumns}
                rows={filteredRows}
              />
            )}
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search product…"
                aria-label="Search products"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-44 pl-7"
              />
            </div>
            <Select
              value={sortKey}
              onValueChange={(value) => setSortKey(value as SortKey)}
            >
              <SelectTrigger className="w-44" aria-label="Sort">
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
        {statusFilter !== null && (
          <button
            type="button"
            onClick={() => setStatusFilter(null)}
            className="self-start text-xs font-medium underline-offset-4 hover:underline"
          >
            Show all products
          </button>
        )}
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
      </Section>
    </div>
  );
}
