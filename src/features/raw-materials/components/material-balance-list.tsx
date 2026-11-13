"use client";

import Link from "next/link";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { ListSearch } from "@/components/ui/list-search";
import { ToneBadge } from "@/components/ui/tone-badge";
import type { ExportColumn } from "@/lib/export/export-column";
import { FormatKg, FormatRelative } from "@/lib/format";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { useListParams } from "@/lib/use-list-params";
import { cn } from "@/lib/utils";
import { useRawMaterialBalances } from "../hooks/use-raw-materials";
import { FetchRawMaterialBalances } from "../services/raw-material.service";
import type { RawMaterialBalanceDTO } from "../validators/raw-material.schema";

export function MaterialBalanceList({
  detailHrefBase,
}: {
  // When set, material names link to `${detailHrefBase}/${materialId}`
  // (the Manager's ledger-detail page). Omitted for the Inventory
  // Manager's view, which records activity from this same page instead.
  detailHrefBase?: string;
}) {
  const list = useListParams<"name" | "quantity">("name");
  const {
    data: result,
    isLoading,
    isFetching,
  } = useRawMaterialBalances(list.params);

  const columns: DataTableColumn<RawMaterialBalanceDTO>[] = [
    {
      key: "name",
      header: "Material",
      sortKey: "name",
      cell: (balance) =>
        detailHrefBase ? (
          <Link
            href={`${detailHrefBase}/${balance.materialId}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {balance.materialName}
          </Link>
        ) : (
          <span className="font-medium">{balance.materialName}</span>
        ),
    },
    {
      key: "quantity",
      header: "On hand",
      sortKey: "quantity",
      cell: (balance) => {
        const quantity = Number(balance.quantityKg);
        return (
          <span className="inline-flex items-center gap-2">
            <span
              className={cn(
                "font-medium tabular-nums",
                quantity < 0 && "text-destructive",
              )}
            >
              {FormatKg(balance.quantityKg)}
            </span>
            {quantity < 0 && (
              <ToneBadge
                tone="critical"
                title="More was used than was recorded as received. Record a stock count to correct it."
              >
                Negative
              </ToneBadge>
            )}
            {quantity === 0 && <ToneBadge tone="critical">Empty</ToneBadge>}
          </span>
        );
      },
    },
    {
      key: "updated",
      header: "Last movement",
      cell: (balance) =>
        balance.updatedAt
          ? FormatRelative(balance.updatedAt)
          : "No activity yet",
      className: "text-muted-foreground",
    },
  ];

  const exportColumns: ExportColumn<RawMaterialBalanceDTO>[] = [
    { header: "Material", value: (balance) => balance.materialName },
    { header: "On hand (kg)", value: (balance) => balance.quantityKg },
    { header: "Last movement", value: (balance) => balance.updatedAt ?? "" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ListSearch
          placeholder="Search materials…"
          onSearch={list.setSearch}
          className="w-full sm:w-64"
        />
        <ExportMenu
          filename="material-balances"
          title="Raw material balances"
          columns={exportColumns}
          rows={() =>
            FetchRawMaterialBalances({
              ...list.params,
              page: 1,
              pageSize: MAX_PAGE_SIZE,
            }).then((page) => page.data)
          }
        />
      </div>
      {isLoading ? (
        <TableSkeleton columns={columns.length} />
      ) : (
        <div className={cn(isFetching && "opacity-70 transition-opacity")}>
          <DataTable
            columns={columns}
            data={result?.data ?? []}
            getRowKey={(balance) => balance.materialId}
            emptyMessage="No raw materials match."
            sort={list.sort}
            pagination={list.Bind(result?.pagination)}
          />
        </div>
      )}
    </div>
  );
}
