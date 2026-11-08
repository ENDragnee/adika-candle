"use client";

import { useProduct } from "@/features/products/hooks/use-products";
import { useStockBalances } from "../hooks/use-stock";
import { StockLedger } from "./stock-ledger";

export function ProductStockDetail({ productId }: { productId: string }) {
  const { data: product, isLoading: productLoading } = useProduct(productId);
  const { data: balances } = useStockBalances();
  const balance = balances?.find((b) => b.productId === productId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        {productLoading || !product ? (
          <p className="text-sm text-muted-foreground">Loading product…</p>
        ) : (
          <>
            <h1 className="text-lg font-semibold">
              {product.name} ({product.sku})
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Current balance: {balance?.quantityKg ?? "0"} kg
            </p>
          </>
        )}
      </div>
      <StockLedger productId={productId} />
    </div>
  );
}
