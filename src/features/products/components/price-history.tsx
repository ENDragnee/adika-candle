"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
  const { data: prices, isLoading } = useProductPrices(productId);

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading price history…</p>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={prices ?? []}
      getRowKey={(price) => price.id}
      emptyMessage="No price has been set yet."
    />
  );
}
