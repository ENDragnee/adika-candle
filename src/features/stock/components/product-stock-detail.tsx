"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useProduct } from "@/features/products/hooks/use-products";
import { useStockBalances } from "../hooks/use-stock";
import { StockLedger } from "./stock-ledger";

export function ProductStockDetail({ productId }: { productId: string }) {
  const { data: product, isLoading: productLoading } = useProduct(productId);
  const { data: balancesResult } = useStockBalances({ productId });
  const balance = balancesResult?.data[0];

  return (
    <div className="flex flex-col gap-4">
      <div>
        {productLoading || !product ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
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
