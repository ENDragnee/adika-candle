"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { useRawMaterialBalances } from "../hooks/use-raw-materials";
import type { RawMaterialBalanceDTO } from "../validators/raw-material.schema";

function FormatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

export function MaterialBalanceList({
  detailHrefBase,
}: {
  // When set, material names link to `${detailHrefBase}/${materialId}`
  // (the Manager's ledger-detail page). Omitted for the Inventory
  // Manager's view, which records activity from this same page instead.
  detailHrefBase?: string;
}) {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useRawMaterialBalances({ page });

  const columns: DataTableColumn<RawMaterialBalanceDTO>[] = [
    {
      key: "name",
      header: "Name",
      cell: (balance) =>
        detailHrefBase ? (
          <Link
            href={`${detailHrefBase}/${balance.materialId}`}
            className="underline underline-offset-4"
          >
            {balance.materialName}
          </Link>
        ) : (
          balance.materialName
        ),
    },
    {
      key: "quantity",
      header: "Quantity (kg)",
      cell: (balance) => balance.quantityKg,
    },
    {
      key: "updated",
      header: "Last updated",
      cell: (balance) => FormatDateTime(balance.updatedAt),
      className: "text-muted-foreground",
    },
  ];

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
    <DataTable
      columns={columns}
      data={result?.data ?? []}
      getRowKey={(balance) => balance.materialId}
      emptyMessage="No raw materials yet."
      pagination={{
        page,
        totalPages: result?.pagination.totalPages ?? 1,
        onPageChange: setPage,
      }}
    />
  );
}
