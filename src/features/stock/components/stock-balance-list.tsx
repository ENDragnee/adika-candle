"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import type { ExportColumn } from "@/lib/export/export-column";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { useStockBalances } from "../hooks/use-stock";
import { FetchStockBalances } from "../services/stock.service";
import type { StockBalanceDTO } from "../validators/stock.schema";

function FormatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

export function StockBalanceList({
  detailHrefBase,
}: {
  // When set, product names link to `${detailHrefBase}/${productId}`
  // (the Manager's ledger-detail page). Omitted for the Inventory
  // Manager's read-only view, which has no detail page.
  detailHrefBase?: string;
}) {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useStockBalances({ page });

  const columns: DataTableColumn<StockBalanceDTO>[] = [
    {
      key: "name",
      header: "Name",
      cell: (balance) =>
        detailHrefBase ? (
          <Link
            href={`${detailHrefBase}/${balance.productId}`}
            className="underline underline-offset-4"
          >
            {balance.productName}
          </Link>
        ) : (
          balance.productName
        ),
    },
    {
      key: "sku",
      header: "SKU",
      cell: (balance) => balance.productSku,
      className: "text-muted-foreground",
    },
    {
      key: "quantity",
      header: "Quantity (kg)",
      cell: (balance) => balance.quantityKg,
    },
    {
      key: "updated",
      header: "Last updated",
      cell: (balance) => FormatDateTime(balance.updatedAt),
      className: "text-muted-foreground",
    },
  ];

  const exportColumns: ExportColumn<StockBalanceDTO>[] = [
    { header: "Name", value: (balance) => balance.productName },
    { header: "SKU", value: (balance) => balance.productSku },
    { header: "Quantity (kg)", value: (balance) => balance.quantityKg },
    {
      header: "Last updated",
      value: (balance) => FormatDateTime(balance.updatedAt),
    },
  ];

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ExportMenu
          filename="stock-balances"
          title="Stock balances"
          columns={exportColumns}
          rows={() =>
            FetchStockBalances({ pageSize: MAX_PAGE_SIZE }).then(
              (result) => result.data,
            )
          }
        />
      </div>
      <DataTable
        columns={columns}
        data={result?.data ?? []}
        getRowKey={(balance) => balance.productId}
        emptyMessage="No products yet."
        pagination={{
          page,
          totalPages: result?.pagination.totalPages ?? 1,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
