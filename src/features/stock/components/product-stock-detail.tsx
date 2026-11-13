"use client";

import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { StockCountDialog } from "@/components/inventory/stock-count-dialog";
import { usePageHeader } from "@/components/shell/use-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { CardSkeleton } from "@/components/ui/skeleton";
import { BalanceHistoryChart } from "@/features/analytics/components/balance-history-chart";
import { useProduct } from "@/features/products/hooks/use-products";
import { FormatKg, FormatRelative } from "@/lib/format";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import {
  useProductLedger,
  useRecordStockCount,
  useStockBalances,
} from "../hooks/use-stock";
import { ClassifyStock } from "../stock-status";
import { StockLedger } from "./stock-ledger";
import { STOCK_STATUS_META, StockStatusBadge } from "./stock-status-badge";

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold tabular-nums">{children}</span>
      </CardContent>
    </Card>
  );
}

export function ProductStockDetail({
  productId,
  canAdjust,
}: {
  productId: string;
  canAdjust: boolean;
}) {
  const { data: product } = useProduct(productId);
  const { data: balancesResult, isLoading } = useStockBalances({ productId });
  const { data: recent } = useProductLedger(productId, {
    pageSize: MAX_PAGE_SIZE,
  });
  const recordCount = useRecordStockCount(productId);
  const balance = balancesResult?.data[0];

  usePageHeader({
    title: product?.name ?? null,
    description: product
      ? `SKU ${product.sku} · stock on hand and history`
      : null,
    parent: { label: "Stock", href: "/manager/stock" },
  });

  if (isLoading || !balance) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const status = ClassifyStock(
    Number(balance.quantityKg),
    balance.thresholdKg === null ? null : Number(balance.thresholdKg),
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <StockStatusBadge status={status} />
          {STOCK_STATUS_META[status].description}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link href={`/manager/products/${productId}`}>
              Product details
              <ArrowSquareOutIcon data-icon="inline-end" />
            </Link>
          </Button>
          {canAdjust && (
            <StockCountDialog
              itemName={balance.productName}
              currentKg={balance.quantityKg}
              onSubmit={(input) => recordCount.mutateAsync(input)}
              isPending={recordCount.isPending}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Fact label="On hand">
          <span
            className={cn(Number(balance.quantityKg) < 0 && "text-destructive")}
          >
            {FormatKg(balance.quantityKg)}
          </span>
        </Fact>
        <Fact label="Low-stock alert level">
          {balance.thresholdKg === null ? (
            <Link
              href={`/manager/products/${productId}`}
              className="text-sm font-medium underline-offset-4 hover:underline"
            >
              Not set — set one
            </Link>
          ) : (
            FormatKg(balance.thresholdKg)
          )}
        </Fact>
        <Fact label="Last movement">
          {balance.updatedAt ? FormatRelative(balance.updatedAt) : "None yet"}
        </Fact>
      </div>

      <Section
        title="Balance over time"
        description="On-hand balance after each recent movement."
      >
        <Card>
          <CardContent>
            <BalanceHistoryChart
              entries={recent?.data ?? []}
              thresholdKg={balance.thresholdKg}
            />
          </CardContent>
        </Card>
      </Section>

      <Section
        title="History"
        description="Every movement in and out, newest first."
      >
        <StockLedger productId={productId} />
      </Section>
    </div>
  );
}
