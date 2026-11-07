"use client";

import { useProductPrices } from "../hooks/use-prices";

function FormatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function PriceHistory({ productId }: { productId: string }) {
  const { data: prices, isLoading } = useProductPrices(productId);

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading price history…</p>
    );
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="p-2 text-sm font-medium">Amount / kg</th>
            <th className="p-2 text-sm font-medium">Effective from</th>
            <th className="p-2 text-sm font-medium">Effective to</th>
          </tr>
        </thead>
        <tbody>
          {prices?.length ? (
            prices.map((price) => (
              <tr key={price.id} className="border-b border-border">
                <td className="p-2 text-sm">{price.amountPerKg}</td>
                <td className="p-2 text-sm">
                  {FormatDateTime(price.effectiveFrom)}
                </td>
                <td className="p-2 text-sm text-muted-foreground">
                  {price.effectiveTo
                    ? FormatDateTime(price.effectiveTo)
                    : "Current"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={3}
                className="p-3 text-center text-sm text-muted-foreground"
              >
                No price has been set yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
