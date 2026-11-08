"use client";

import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { useMaterialLedger } from "../hooks/use-material-activity";
import type { RawMaterialLedgerEntryDTO } from "../validators/raw-material.schema";

function FormatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

const columns: DataTableColumn<RawMaterialLedgerEntryDTO>[] = [
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

export function MaterialLedger({ materialId }: { materialId: string }) {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useMaterialLedger(materialId, { page });

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
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
  );
}
