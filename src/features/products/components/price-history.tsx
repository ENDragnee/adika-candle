"use client";

import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { FormatDateTime, FormatMoney } from "@/lib/format";
import { usePagination } from "@/lib/use-pagination";
import { useProductPrices } from "../hooks/use-prices";
import type { PriceDTO } from "../validators/price.schema";

const columns: DataTableColumn<PriceDTO>[] = [
  {
    key: "amount",
    header: "Amount / kg",
    cell: (price) => FormatMoney(price.amountPerKg),
  },
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
  const pager = usePagination();
  const { data: result, isLoading } = useProductPrices(productId, pager.params);

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
    <DataTable
      columns={columns}
      data={result?.data ?? []}
      getRowKey={(price) => price.id}
      emptyMessage="No price has been set yet."
      pagination={pager.Bind(result?.pagination)}
    />
  );
}
