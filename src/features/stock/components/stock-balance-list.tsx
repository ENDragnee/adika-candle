"use client";

import Link from "next/link";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { ListSearch } from "@/components/ui/list-search";
import type { ExportColumn } from "@/lib/export/export-column";
import { FormatKg, FormatRelative } from "@/lib/format";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { useListParams } from "@/lib/use-list-params";
import { cn } from "@/lib/utils";
import { useStockBalances } from "../hooks/use-stock";
import { FetchStockBalances } from "../services/stock.service";
import { ClassifyStock } from "../stock-status";
import type { StockBalanceDTO } from "../validators/stock.schema";
import { STOCK_STATUS_META, StockStatusBadge } from "./stock-status-badge";

function StatusOf(balance: StockBalanceDTO) {
  return ClassifyStock(
    Number(balance.quantityKg),
    balance.thresholdKg === null ? null : Number(balance.thresholdKg),
  );
}

export function StockBalanceList({
  detailHrefBase,
}: {
  // When set, product names link to `${detailHrefBase}/${productId}`
  // (the Manager's ledger-detail page). Omitted for the Inventory
  // Manager's read-only view, which has no detail page.
  detailHrefBase?: string;
}) {
  const list = useListParams<"name" | "quantity">("name");
  const { data: result, isLoading, isFetching } = useStockBalances(list.params);

  const columns: DataTableColumn<StockBalanceDTO>[] = [
    {
      key: "name",
      header: "Product",
      sortKey: "name",
      cell: (balance) => (
        <span className="flex flex-col">
          {detailHrefBase ? (
            <Link
              href={`${detailHrefBase}/${balance.productId}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {balance.productName}
            </Link>
          ) : (
            <span className="font-medium">{balance.productName}</span>
          )}
          <span className="text-xs text-muted-foreground">
            {balance.productSku}
            {!balance.isActive && " · inactive"}
          </span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (balance) => <StockStatusBadge status={StatusOf(balance)} />,
    },
    {
      key: "quantity",
      header: "On hand",
      sortKey: "quantity",
      cell: (balance) => (
        <span
          className={cn(
            "font-medium tabular-nums",
            Number(balance.quantityKg) < 0 && "text-destructive",
          )}
        >
          {FormatKg(balance.quantityKg)}
        </span>
      ),
      className: "text-right",
    },
    {
      key: "threshold",
      header: "Alert level",
      cell: (balance) =>
        balance.thresholdKg === null
          ? "Not set"
          : FormatKg(balance.thresholdKg),
      className: "text-right tabular-nums text-muted-foreground",
    },
    {
      key: "updated",
      header: "Last movement",
      cell: (balance) =>
        balance.updatedAt
          ? FormatRelative(balance.updatedAt)
          : "No activity yet",
      className: "text-muted-foreground",
    },
  ];

  const exportColumns: ExportColumn<StockBalanceDTO>[] = [
    { header: "Product", value: (balance) => balance.productName },
    { header: "SKU", value: (balance) => balance.productSku },
    {
      header: "Status",
      value: (balance) => STOCK_STATUS_META[StatusOf(balance)].label,
    },
    { header: "On hand (kg)", value: (balance) => balance.quantityKg },
    {
      header: "Alert level (kg)",
      value: (balance) => balance.thresholdKg ?? "",
    },
    { header: "Last movement", value: (balance) => balance.updatedAt ?? "" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ListSearch
          placeholder="Search name or SKU…"
          onSearch={list.setSearch}
          className="w-full sm:w-64"
        />
        <ExportMenu
          filename="stock-balances"
          title="Stock balances"
          columns={exportColumns}
          rows={() =>
            FetchStockBalances({
              ...list.params,
              page: 1,
              pageSize: MAX_PAGE_SIZE,
            }).then((page) => page.data)
          }
        />
      </div>
      {isLoading ? (
        <TableSkeleton columns={columns.length} />
      ) : (
        <div className={cn(isFetching && "opacity-70 transition-opacity")}>
          <DataTable
            columns={columns}
            data={result?.data ?? []}
            getRowKey={(balance) => balance.productId}
            emptyMessage="No products match."
            sort={list.sort}
            pagination={list.Bind(result?.pagination)}
          />
        </div>
      )}
    </div>
  );
}
