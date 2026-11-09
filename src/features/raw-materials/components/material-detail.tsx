"use client";

import { usePageHeader } from "@/components/shell/use-page-header";
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
  usePageHeader({
    title: material?.name,
    description: material
      ? `Current balance: ${balance?.quantityKg ?? "0"} kg`
      : null,
  });

  return (
    <div className="flex flex-col gap-4">
      {materialLoading && <Skeleton className="h-4 w-40" />}
      <MaterialLedger materialId={materialId} />
    </div>
  );
}
