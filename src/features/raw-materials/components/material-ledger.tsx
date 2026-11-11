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
import { useMaterialLedger } from "../hooks/use-material-activity";
import { FetchMaterialLedger } from "../services/raw-material.service";
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

const exportColumns: ExportColumn<RawMaterialLedgerEntryDTO>[] = [
  { header: "Type", value: (entry) => entry.type },
  { header: "Quantity (kg)", value: (entry) => entry.quantityKg },
  { header: "Balance after (kg)", value: (entry) => entry.balanceAfterKg },
  { header: "Note", value: (entry) => entry.note ?? "—" },
  { header: "Date", value: (entry) => FormatDateTime(entry.createdAt) },
];

export function MaterialLedger({ materialId }: { materialId: string }) {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useMaterialLedger(materialId, { page });

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ExportMenu
          filename="material-ledger"
          title="Raw material ledger"
          columns={exportColumns}
          rows={() =>
            FetchMaterialLedger(materialId, { pageSize: MAX_PAGE_SIZE }).then(
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
