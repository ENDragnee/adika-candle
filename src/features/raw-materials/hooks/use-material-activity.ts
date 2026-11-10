"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GetErrorMessage } from "@/lib/get-error-message";
import type { PaginationParams } from "@/lib/pagination";
import {
  FetchMaterialLedger,
  RecordMaterialActivity,
} from "../services/raw-material.service";
import type { RecordMaterialActivityInput } from "../validators/raw-material.schema";
import { RAW_MATERIAL_BALANCES_QUERY_KEY } from "./use-raw-materials";

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
    onSuccess: (_entry, variables) => {
      queryClient.invalidateQueries({
        queryKey: RAW_MATERIAL_BALANCES_QUERY_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: materialLedgerQueryKey(variables.materialId),
      });
      toast.success("Material activity recorded");
    },
    onError: (error) => {
      toast.error(GetErrorMessage(error, "Couldn't record activity"));
    },
  });
}
