"use client";

import { StockCountDialog } from "@/components/inventory/stock-count-dialog";
import { usePageHeader } from "@/components/shell/use-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { CardSkeleton } from "@/components/ui/skeleton";
import { BalanceHistoryChart } from "@/features/analytics/components/balance-history-chart";
import { FormatKg, FormatRelative } from "@/lib/format";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import {
  useMaterialLedger,
  useRecordMaterialCount,
} from "../hooks/use-material-activity";
import {
  useRawMaterial,
  useRawMaterialBalances,
} from "../hooks/use-raw-materials";
import { MaterialLedger } from "./material-ledger";

export function MaterialDetail({
  materialId,
  canAdjust,
}: {
  materialId: string;
  canAdjust: boolean;
}) {
  const { data: material } = useRawMaterial(materialId);
  const { data: balancesResult, isLoading } = useRawMaterialBalances({
    materialId,
  });
  const { data: recent } = useMaterialLedger(materialId, {
    pageSize: MAX_PAGE_SIZE,
  });
  const recordCount = useRecordMaterialCount(materialId);
  const balance = balancesResult?.data[0];

  usePageHeader({
    title: material?.name ?? null,
    description: material
      ? "Raw material on hand and everything received or used"
      : null,
    parent: { label: "Materials", href: "/manager/materials" },
  });

  if (isLoading || !balance) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const quantity = Number(balance.quantityKg);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:max-w-md">
          <Card size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">On hand</span>
              <span
                className={cn(
                  "text-lg font-semibold tabular-nums",
                  quantity < 0 && "text-destructive",
                )}
              >
                {FormatKg(balance.quantityKg)}
              </span>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                Last movement
              </span>
              <span className="text-lg font-semibold">
                {balance.updatedAt
                  ? FormatRelative(balance.updatedAt)
                  : "None yet"}
              </span>
            </CardContent>
          </Card>
        </div>
        {canAdjust && (
          <StockCountDialog
            itemName={balance.materialName}
            currentKg={balance.quantityKg}
            onSubmit={(input) => recordCount.mutateAsync(input)}
            isPending={recordCount.isPending}
          />
        )}
      </div>
      {quantity < 0 && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          The recorded balance is negative — more was recorded as used than as
          received.{" "}
          {canAdjust
            ? "Record a stock count to correct it."
            : "Ask a Manager to record a stock count."}
        </p>
      )}

      <Section
        title="Balance over time"
        description="On-hand balance after each recent movement."
      >
        <Card>
          <CardContent>
            <BalanceHistoryChart entries={recent?.data ?? []} />
          </CardContent>
        </Card>
      </Section>

      <Section title="History" description="Newest first.">
        <MaterialLedger materialId={materialId} />
      </Section>
    </div>
  );
}
