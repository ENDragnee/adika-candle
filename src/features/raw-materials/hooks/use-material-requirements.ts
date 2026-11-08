"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateMaterialRequirement,
  FetchMaterialRequirements,
  UpdateMaterialRequirement,
} from "../services/material-requirement.service";
import type {
  CreateMaterialRequirementInput,
  UpdateMaterialRequirementInput,
} from "../validators/material-requirement.schema";

export const materialRequirementsQueryKey = (productId: string) =>
  ["products", productId, "material-requirements"] as const;

export function useMaterialRequirements(productId: string) {
  return useQuery({
    queryKey: materialRequirementsQueryKey(productId),
    queryFn: () => FetchMaterialRequirements(productId),
    enabled: Boolean(productId),
  });
}

export function useCreateMaterialRequirement(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMaterialRequirementInput) =>
      CreateMaterialRequirement(productId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: materialRequirementsQueryKey(productId),
      }),
  });
}

export function useUpdateMaterialRequirement(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateMaterialRequirementInput) =>
      UpdateMaterialRequirement(productId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: materialRequirementsQueryKey(productId),
      }),
  });
}
