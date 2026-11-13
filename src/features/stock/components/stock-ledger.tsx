"use client";

import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { ToneBadge } from "@/components/ui/tone-badge";
import type { ExportColumn } from "@/lib/export/export-column";
import {
  FormatDateTime,
  FormatKg,
  FormatNumber,
  FormatSignedKg,
} from "@/lib/format";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { useProductLedger } from "../hooks/use-stock";
import { STOCK_ENTRY_META } from "../labels";
import { FetchProductLedger } from "../services/stock.service";
import type { StockLedgerEntryDTO } from "../validators/stock.schema";

const columns: DataTableColumn<StockLedgerEntryDTO>[] = [
  {
    key: "date",
    header: "Date",
    cell: (entry) => FormatDateTime(entry.createdAt),
  },
  {
    key: "type",
    header: "What happened",
    cell: (entry) => (
      <ToneBadge tone={STOCK_ENTRY_META[entry.type].tone}>
        {STOCK_ENTRY_META[entry.type].label}
      </ToneBadge>
    ),
  },
  {
    key: "change",
    header: "Change",
    cell: (entry) => (
      <span
        className={cn(
          "font-medium tabular-nums",
          Number(entry.quantityKg) < 0 && "text-muted-foreground",
        )}
      >
        {FormatSignedKg(entry.quantityKg)}
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
    key: "detail",
    header: "Details",
    cell: (entry) => (
      <span className="flex flex-col text-muted-foreground">
        {entry.inputQuantity && entry.inputUnitName && (
          <span>
            {FormatNumber(entry.inputQuantity)} {entry.inputUnitName}
          </span>
        )}
        {entry.note && <span className="text-xs">{entry.note}</span>}
        {!entry.note && !entry.inputQuantity && "—"}
      </span>
    ),
    className: "max-w-72 whitespace-normal",
  },
  {
    key: "by",
    header: "By",
    cell: (entry) => entry.createdByName ?? "—",
    className: "text-muted-foreground",
  },
];

const exportColumns: ExportColumn<StockLedgerEntryDTO>[] = [
  { header: "Date", value: (entry) => FormatDateTime(entry.createdAt) },
  {
    header: "What happened",
    value: (entry) => STOCK_ENTRY_META[entry.type].label,
  },
  { header: "Change (kg)", value: (entry) => entry.quantityKg },
  { header: "Balance after (kg)", value: (entry) => entry.balanceAfterKg },
  {
    header: "Entered as",
    value: (entry) =>
      entry.inputQuantity && entry.inputUnitName
        ? `${entry.inputQuantity} ${entry.inputUnitName}`
        : "",
  },
  { header: "Note", value: (entry) => entry.note ?? "" },
  { header: "By", value: (entry) => entry.createdByName ?? "" },
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
          filename="stock-history"
          title="Stock history"
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
        emptyMessage="No stock movements yet."
        pagination={{
          page,
          totalPages: result?.pagination.totalPages ?? 1,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
