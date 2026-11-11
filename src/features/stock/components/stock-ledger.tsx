"use client";

import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import type { ExportColumn } from "@/lib/export/export-column";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { useProductLedger } from "../hooks/use-stock";
import { FetchProductLedger } from "../services/stock.service";
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

const exportColumns: ExportColumn<StockLedgerEntryDTO>[] = [
  { header: "Type", value: (entry) => entry.type },
  { header: "Quantity (kg)", value: (entry) => entry.quantityKg },
  { header: "Balance after (kg)", value: (entry) => entry.balanceAfterKg },
  {
    header: "Input",
    value: (entry) =>
      entry.inputQuantity && entry.inputUnitName
        ? `${entry.inputQuantity} ${entry.inputUnitName}`
        : "—",
  },
  { header: "Note", value: (entry) => entry.note ?? "—" },
  { header: "Date", value: (entry) => FormatDateTime(entry.createdAt) },
];

export function StockLedger({ productId }: { productId: string }) {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useProductLedger(productId, { page });

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ExportMenu
          filename="stock-ledger"
          title="Stock ledger"
          columns={exportColumns}
          rows={() =>
            FetchProductLedger(productId, { pageSize: MAX_PAGE_SIZE }).then(
              (result) => result.data,
            )
          }
        />
      </div>
      <DataTable
        columns={columns}
        data={result?.data ?? []}
        getRowKey={(entry) => entry.id}
        emptyMessage="No ledger entries yet."
        pagination={{
          page,
          totalPages: result?.pagination.totalPages ?? 1,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
