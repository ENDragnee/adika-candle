"use client";

import { useSales } from "../hooks/use-sales";

function FormatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

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
    <div className="overflow-x-auto border border-border">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="p-2 text-sm font-medium">Reference</th>
            <th className="p-2 text-sm font-medium">Product</th>
            <th className="p-2 text-sm font-medium">Customer</th>
            <th className="p-2 text-sm font-medium">Quantity</th>
            <th className="p-2 text-sm font-medium">Total</th>
            <th className="p-2 text-sm font-medium">Payment</th>
            <th className="p-2 text-sm font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {sales?.length ? (
            sales.map((sale) => (
              <tr key={sale.id} className="border-b border-border">
                <td className="p-2 text-sm">{sale.referenceCode}</td>
                <td className="p-2 text-sm">
                  {sale.productName}{" "}
                  <span className="text-muted-foreground">
                    ({sale.productSku})
                  </span>
                </td>
                <td className="p-2 text-sm">
                  {sale.customerName ?? (
                    <span className="text-muted-foreground">Walk-in</span>
                  )}
                </td>
                <td className="p-2 text-sm">
                  {sale.inputQuantity} {sale.inputUnitName}
                </td>
                <td className="p-2 text-sm">{sale.totalAmount}</td>
                <td className="p-2 text-sm">{sale.paymentType}</td>
                <td className="p-2 text-sm text-muted-foreground">
                  {FormatDateTime(sale.createdAt)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={7}
                className="p-3 text-center text-sm text-muted-foreground"
              >
                No sales yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
