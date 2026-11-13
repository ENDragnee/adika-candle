"use client";

import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { ToneBadge } from "@/components/ui/tone-badge";
import type { ExportColumn } from "@/lib/export/export-column";
import { FormatDateTime, FormatKg, FormatSignedKg } from "@/lib/format";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { usePagination } from "@/lib/use-pagination";
import { useMaterialLedger } from "../hooks/use-material-activity";
import { MATERIAL_ENTRY_META, MaterialEntryDelta } from "../labels";
import { FetchMaterialLedger } from "../services/raw-material.service";
import type { RawMaterialLedgerEntryDTO } from "../validators/raw-material.schema";

const columns: DataTableColumn<RawMaterialLedgerEntryDTO>[] = [
  {
    key: "date",
    header: "Date",
    cell: (entry) => FormatDateTime(entry.createdAt),
  },
  {
    key: "type",
    header: "What happened",
    cell: (entry) => (
      <ToneBadge tone={MATERIAL_ENTRY_META[entry.type].tone}>
        {MATERIAL_ENTRY_META[entry.type].label}
      </ToneBadge>
    ),
  },
  {
    key: "change",
    header: "Change",
    cell: (entry) => (
      <span className="font-medium tabular-nums">
        {FormatSignedKg(MaterialEntryDelta(entry.type, entry.quantityKg))}
      </span>
    ),
    className: "text-right",
  },
  {
    key: "balance",
    header: "Balance after",
    cell: (entry) => FormatKg(entry.balanceAfterKg),
    className: "text-right tabular-nums",
  },
  {
    key: "note",
    header: "Note",
    cell: (entry) => entry.note ?? "—",
    className: "max-w-72 whitespace-normal text-muted-foreground",
  },
  {
    key: "by",
    header: "By",
    cell: (entry) => entry.createdByName ?? "—",
    className: "text-muted-foreground",
  },
];

const exportColumns: ExportColumn<RawMaterialLedgerEntryDTO>[] = [
  { header: "Date", value: (entry) => FormatDateTime(entry.createdAt) },
  {
    header: "What happened",
    value: (entry) => MATERIAL_ENTRY_META[entry.type].label,
  },
  {
    header: "Change (kg)",
    value: (entry) => String(MaterialEntryDelta(entry.type, entry.quantityKg)),
  },
  { header: "Balance after (kg)", value: (entry) => entry.balanceAfterKg },
  { header: "Note", value: (entry) => entry.note ?? "" },
  { header: "By", value: (entry) => entry.createdByName ?? "" },
];

export function MaterialLedger({ materialId }: { materialId: string }) {
  const pager = usePagination();
  const { data: result, isLoading } = useMaterialLedger(
    materialId,
    pager.params,
  );

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
        emptyMessage="No activity recorded yet."
        pagination={pager.Bind(result?.pagination)}
      />
    </div>
  );
}
