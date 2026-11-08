"use client";

import Link from "next/link";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { useStockBalances } from "../hooks/use-stock";
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
  const { data: balances, isLoading } = useStockBalances();

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

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
    <DataTable
      columns={columns}
      data={balances ?? []}
      getRowKey={(balance) => balance.productId}
      emptyMessage="No products yet."
    />
  );
}
