"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { PaginationParams } from "@/lib/pagination";
import { InvalidateLedgerQueries } from "@/lib/query-invalidation";
import type { StockCountInput } from "@/lib/schemas/stock-count.schema";
import {
  FetchMaterialLedger,
  RecordMaterialActivity,
  RecordMaterialCount,
} from "../services/raw-material.service";
import type { RecordMaterialActivityInput } from "../validators/raw-material.schema";

export const materialLedgerQueryKey = (
  materialId: string,
  params: PaginationParams = {},
) => ["raw-materials", "ledger", materialId, params] as const;

export function useMaterialLedger(
  materialId: string,
  params: PaginationParams = {},
) {
  return useQuery({
    queryKey: materialLedgerQueryKey(materialId, params),
    queryFn: () => FetchMaterialLedger(materialId, params),
    enabled: Boolean(materialId),
  });
}

export function useRecordMaterialActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      materialId,
      input,
    }: {
      materialId: string;
      input: RecordMaterialActivityInput;
    }) => RecordMaterialActivity(materialId, input),
    onSuccess: () => {
      InvalidateLedgerQueries(queryClient);
      toast.success("Material activity recorded");
    },
    meta: { errorTitle: "Couldn't record activity" },
  });
}

export function useRecordMaterialCount(materialId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StockCountInput) =>
      RecordMaterialCount(materialId, input),
    onSuccess: () => {
      InvalidateLedgerQueries(queryClient);
      toast.success("Stock count recorded");
    },
    meta: { errorTitle: "Couldn't record the stock count" },
  });
}
