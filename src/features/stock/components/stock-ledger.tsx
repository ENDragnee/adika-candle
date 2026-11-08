"use client";

import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { useProductLedger } from "../hooks/use-stock";
import type { StockLedgerEntryDTO } from "../validators/stock.schema";

function FormatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

const columns: DataTableColumn<StockLedgerEntryDTO>[] = [
  { key: "type", header: "Type", cell: (entry) => entry.type },
  {
    key: "quantity",
    header: "Quantity (kg)",
    cell: (entry) => entry.quantityKg,
  },
  {
    key: "balance",
    header: "Balance after (kg)",
    cell: (entry) => entry.balanceAfterKg,
  },
  {
    key: "input",
    header: "Input",
    cell: (entry) =>
      entry.inputQuantity && entry.inputUnitName
        ? `${entry.inputQuantity} ${entry.inputUnitName}`
        : "—",
    className: "text-muted-foreground",
  },
  {
    key: "note",
    header: "Note",
    cell: (entry) => entry.note ?? "—",
    className: "text-muted-foreground",
  },
  {
    key: "date",
    header: "Date",
    cell: (entry) => FormatDateTime(entry.createdAt),
    className: "text-muted-foreground",
  },
];

export function StockLedger({ productId }: { productId: string }) {
  const { data: entries, isLoading } = useProductLedger(productId);

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
    <DataTable
      columns={columns}
      data={entries ?? []}
      getRowKey={(entry) => entry.id}
      emptyMessage="No ledger entries yet."
    />
  );
}
