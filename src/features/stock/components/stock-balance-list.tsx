"use client";

import Link from "next/link";
import { useStockBalances } from "../hooks/use-stock";

function FormatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

export function StockBalanceList({
  detailHrefBase,
}: {
  // When set, product names link to `${detailHrefBase}/${productId}`
  // (the Manager's ledger-detail page). Omitted for the Inventory
  // Manager's read-only view, which has no detail page.
  detailHrefBase?: string;
}) {
  const { data: balances, isLoading } = useStockBalances();

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading stock levels…</p>
    );
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="p-2 text-sm font-medium">Name</th>
            <th className="p-2 text-sm font-medium">SKU</th>
            <th className="p-2 text-sm font-medium">Quantity (kg)</th>
            <th className="p-2 text-sm font-medium">Last updated</th>
          </tr>
        </thead>
        <tbody>
          {balances?.length ? (
            balances.map((balance) => (
              <tr key={balance.productId} className="border-b border-border">
                <td className="p-2 text-sm">
                  {detailHrefBase ? (
                    <Link
                      href={`${detailHrefBase}/${balance.productId}`}
                      className="underline underline-offset-4"
                    >
                      {balance.productName}
                    </Link>
                  ) : (
                    balance.productName
                  )}
                </td>
                <td className="p-2 text-sm text-muted-foreground">
                  {balance.productSku}
                </td>
                <td className="p-2 text-sm">{balance.quantityKg}</td>
                <td className="p-2 text-sm text-muted-foreground">
                  {FormatDateTime(balance.updatedAt)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={4}
                className="p-3 text-center text-sm text-muted-foreground"
              >
                No products yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
