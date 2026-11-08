"use client";

import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { useProductPrices } from "../hooks/use-prices";
import type { PriceDTO } from "../validators/price.schema";

function FormatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

const columns: DataTableColumn<PriceDTO>[] = [
  { key: "amount", header: "Amount / kg", cell: (price) => price.amountPerKg },
  {
    key: "from",
    header: "Effective from",
    cell: (price) => FormatDateTime(price.effectiveFrom),
  },
  {
    key: "to",
    header: "Effective to",
    cell: (price) =>
      price.effectiveTo ? FormatDateTime(price.effectiveTo) : "Current",
    className: "text-muted-foreground",
  },
];

export function PriceHistory({ productId }: { productId: string }) {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useProductPrices(productId, { page });

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
    <DataTable
      columns={columns}
      data={result?.data ?? []}
      getRowKey={(price) => price.id}
      emptyMessage="No price has been set yet."
      pagination={{
        page,
        totalPages: result?.pagination.totalPages ?? 1,
        onPageChange: setPage,
      }}
    />
  );
}
