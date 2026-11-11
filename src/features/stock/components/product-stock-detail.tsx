"use client";

import { usePageHeader } from "@/components/shell/use-page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useProduct } from "@/features/products/hooks/use-products";
import { useStockBalances } from "../hooks/use-stock";
import { StockLedger } from "./stock-ledger";

export function ProductStockDetail({ productId }: { productId: string }) {
  const { data: product, isLoading: productLoading } = useProduct(productId);
  const { data: balancesResult } = useStockBalances({ productId });
  const balance = balancesResult?.data[0];
  usePageHeader({
    title: product ? `${product.name} (${product.sku})` : null,
    description: product
      ? `Current balance: ${balance?.quantityKg ?? "0"} kg`
      : null,
  });

  return (
    <div className="flex flex-col gap-4">
      {productLoading && <Skeleton className="h-4 w-40" />}
      <StockLedger productId={productId} />
    </div>
  );
}
