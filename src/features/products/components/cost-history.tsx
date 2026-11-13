"use client";

import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { FormatDateTime, FormatMoney } from "@/lib/format";
import { useProductCosts } from "../hooks/use-costs";
import type { CostDTO } from "../validators/cost.schema";

const columns: DataTableColumn<CostDTO>[] = [
  {
    key: "amount",
    header: "Amount / kg",
    cell: (cost) => FormatMoney(cost.amountPerKg),
  },
  {
    key: "from",
    header: "Effective from",
    cell: (cost) => FormatDateTime(cost.effectiveFrom),
  },
  {
    key: "to",
    header: "Effective to",
    cell: (cost) =>
      cost.effectiveTo ? FormatDateTime(cost.effectiveTo) : "Current",
    className: "text-muted-foreground",
  },
];

export function CostHistory({ productId }: { productId: string }) {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useProductCosts(productId, { page });

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
    <DataTable
      columns={columns}
      data={result?.data ?? []}
      getRowKey={(cost) => cost.id}
      emptyMessage="No cost has been set yet."
      pagination={{
        page,
        totalPages: result?.pagination.totalPages ?? 1,
        onPageChange: setPage,
      }}
    />
  );
}
