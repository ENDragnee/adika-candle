"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useSales } from "../hooks/use-sales";
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

export function SaleList({
  // When set (the Inventory Manager's "own recent sales" page), the list is
  // scoped to sales created by this user id. Omitted on /manager/sales,
  // which sees every sale — see SaleQuerySchema.
  createdById,
}: {
  createdById?: string;
}) {
  const { data: sales, isLoading } = useSales(
    createdById ? { createdById } : undefined,
  );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading sales…</p>;
  }

  return (
    <DataTable
      columns={columns}
      data={sales ?? []}
      getRowKey={(sale) => sale.id}
      emptyMessage="No sales yet."
    />
  );
}
