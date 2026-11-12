"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { PaginationParams } from "@/lib/pagination";
import {
  CreateUnitConversion,
  DeactivateUnitConversion,
  FetchUnitConversions,
  UpdateUnitConversion,
} from "../services/unit-conversion.service";
import type {
  CreateUnitConversionInput,
  UpdateUnitConversionInput,
} from "../validators/unit-conversion.schema";

export const UNIT_CONVERSIONS_QUERY_KEY = ["unit-conversions"] as const;
export const unitConversionsQueryKey = (params: PaginationParams) =>
  ["unit-conversions", params] as const;

export function useUnitConversions(params: PaginationParams = {}) {
  return useQuery({
    queryKey: unitConversionsQueryKey(params),
    queryFn: () => FetchUnitConversions(params),
  });
}

export function useCreateUnitConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUnitConversionInput) =>
      CreateUnitConversion(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNIT_CONVERSIONS_QUERY_KEY });
      toast.success("Unit added");
    },
    meta: { errorTitle: "Couldn't add unit" },
  });
}

export function useUpdateUnitConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateUnitConversionInput;
    }) => UpdateUnitConversion(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNIT_CONVERSIONS_QUERY_KEY });
      toast.success("Unit updated");
    },
    meta: { errorTitle: "Couldn't save unit" },
  });
}

export function useDeactivateUnitConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => DeactivateUnitConversion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNIT_CONVERSIONS_QUERY_KEY });
      toast.success("Unit deactivated");
    },
    meta: { errorTitle: "Couldn't deactivate unit" },
  });
}
