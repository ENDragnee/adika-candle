"use client";

import { usePageTitle } from "@/components/shell/use-page-title";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useRawMaterial,
  useRawMaterialBalances,
} from "../hooks/use-raw-materials";
import { MaterialLedger } from "./material-ledger";

export function MaterialDetail({ materialId }: { materialId: string }) {
  const { data: material, isLoading: materialLoading } =
    useRawMaterial(materialId);
  const { data: balancesResult } = useRawMaterialBalances({ materialId });
  const balance = balancesResult?.data[0];
  usePageTitle(material?.name);

  return (
    <div className="flex flex-col gap-4">
      <div>
        {materialLoading || !material ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : (
          <>
            <h1 className="text-lg font-semibold">{material.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Current balance: {balance?.quantityKg ?? "0"} kg
            </p>
          </>
        )}
      </div>
      <MaterialLedger materialId={materialId} />
    </div>
  );
}
