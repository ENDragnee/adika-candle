"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaginationParams } from "@/lib/pagination";
import {
  CreateRawMaterial,
  FetchRawMaterial,
  FetchRawMaterialBalances,
  FetchRawMaterials,
  type RawMaterialBalancesQueryParams,
  UpdateRawMaterial,
} from "../services/raw-material.service";
import type {
  CreateRawMaterialInput,
  UpdateRawMaterialInput,
} from "../validators/raw-material.schema";

export const RAW_MATERIALS_QUERY_KEY = ["raw-materials"] as const;
export const rawMaterialsQueryKey = (params: PaginationParams) =>
  ["raw-materials", params] as const;
export const rawMaterialQueryKey = (id: string) =>
  ["raw-materials", id] as const;
export const RAW_MATERIAL_BALANCES_QUERY_KEY = [
  "raw-materials",
  "balances",
] as const;
export const rawMaterialBalancesQueryKey = (
  params: RawMaterialBalancesQueryParams,
) => ["raw-materials", "balances", params] as const;

export function useRawMaterials(params: PaginationParams = {}) {
  return useQuery({
    queryKey: rawMaterialsQueryKey(params),
    queryFn: () => FetchRawMaterials(params),
  });
}

export function useRawMaterial(id: string) {
  return useQuery({
    queryKey: rawMaterialQueryKey(id),
    queryFn: () => FetchRawMaterial(id),
    enabled: Boolean(id),
  });
}

export function useRawMaterialBalances(
  params: RawMaterialBalancesQueryParams = {},
) {
  return useQuery({
    queryKey: rawMaterialBalancesQueryKey(params),
    queryFn: () => FetchRawMaterialBalances(params),
  });
}

export function useCreateRawMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRawMaterialInput) => CreateRawMaterial(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RAW_MATERIALS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: RAW_MATERIAL_BALANCES_QUERY_KEY,
      });
    },
  });
}

export function useUpdateRawMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateRawMaterialInput;
    }) => UpdateRawMaterial(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RAW_MATERIALS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: RAW_MATERIAL_BALANCES_QUERY_KEY,
      });
    },
  });
}

export function useDeactivateRawMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => UpdateRawMaterial(id, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RAW_MATERIALS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: RAW_MATERIAL_BALANCES_QUERY_KEY,
      });
    },
  });
}
