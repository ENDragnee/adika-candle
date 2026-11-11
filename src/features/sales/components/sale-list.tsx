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
import { useSales } from "../hooks/use-sales";
import { FetchSales } from "../services/sale.service";
import type { SaleDTO } from "../validators/sale.schema";

function FormatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

const columns: DataTableColumn<SaleDTO>[] = [
  { key: "reference", header: "Reference", cell: (sale) => sale.referenceCode },
  {
    key: "product",
    header: "Product",
    cell: (sale) => (
      <>
        {sale.productName}{" "}
        <span className="text-muted-foreground">({sale.productSku})</span>
      </>
    ),
  },
  {
    key: "customer",
    header: "Customer",
    cell: (sale) =>
      sale.customerName ?? (
        <span className="text-muted-foreground">Walk-in</span>
      ),
  },
  {
    key: "quantity",
    header: "Quantity",
    cell: (sale) => `${sale.inputQuantity} ${sale.inputUnitName}`,
  },
  { key: "total", header: "Total", cell: (sale) => sale.totalAmount },
  { key: "payment", header: "Payment", cell: (sale) => sale.paymentType },
  {
    key: "date",
    header: "Date",
    cell: (sale) => FormatDateTime(sale.createdAt),
    className: "text-muted-foreground",
  },
];

const exportColumns: ExportColumn<SaleDTO>[] = [
  { header: "Reference", value: (sale) => sale.referenceCode },
  {
    header: "Product",
    value: (sale) => `${sale.productName} (${sale.productSku})`,
  },
  { header: "Customer", value: (sale) => sale.customerName ?? "Walk-in" },
  {
    header: "Quantity",
    value: (sale) => `${sale.inputQuantity} ${sale.inputUnitName}`,
  },
  { header: "Total", value: (sale) => sale.totalAmount },
  { header: "Payment", value: (sale) => sale.paymentType },
  { header: "Date", value: (sale) => FormatDateTime(sale.createdAt) },
];

export function SaleList({
  // When set (the Inventory Manager's "own recent sales" page), the list is
  // scoped to sales created by this user id. Omitted on /manager/sales,
  // which sees every sale — see SaleQuerySchema.
  createdById,
}: {
  createdById?: string;
}) {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useSales({
    page,
    ...(createdById && { createdById }),
  });

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ExportMenu
          filename="sales"
          title="Sales"
          columns={exportColumns}
          rows={() =>
            FetchSales({
              pageSize: MAX_PAGE_SIZE,
              ...(createdById && { createdById }),
            }).then((result) => result.data)
          }
        />
      </div>
      <DataTable
        columns={columns}
        data={result?.data ?? []}
        getRowKey={(sale) => sale.id}
        emptyMessage="No sales yet."
        pagination={{
          page,
          totalPages: result?.pagination.totalPages ?? 1,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
