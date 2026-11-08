"use client";

import { useProductLedger } from "../hooks/use-stock";

function FormatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function StockLedger({ productId }: { productId: string }) {
  const { data: entries, isLoading } = useProductLedger(productId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading ledger…</p>;
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="p-2 text-sm font-medium">Type</th>
            <th className="p-2 text-sm font-medium">Quantity (kg)</th>
            <th className="p-2 text-sm font-medium">Balance after (kg)</th>
            <th className="p-2 text-sm font-medium">Input</th>
            <th className="p-2 text-sm font-medium">Note</th>
            <th className="p-2 text-sm font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {entries?.length ? (
            entries.map((entry) => (
              <tr key={entry.id} className="border-b border-border">
                <td className="p-2 text-sm">{entry.type}</td>
                <td className="p-2 text-sm">{entry.quantityKg}</td>
                <td className="p-2 text-sm">{entry.balanceAfterKg}</td>
                <td className="p-2 text-sm text-muted-foreground">
                  {entry.inputQuantity && entry.inputUnitName
                    ? `${entry.inputQuantity} ${entry.inputUnitName}`
                    : "—"}
                </td>
                <td className="p-2 text-sm text-muted-foreground">
                  {entry.note ?? "—"}
                </td>
                <td className="p-2 text-sm text-muted-foreground">
                  {FormatDateTime(entry.createdAt)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={6}
                className="p-3 text-center text-sm text-muted-foreground"
              >
                No ledger entries yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
