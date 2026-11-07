"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useUnitConversions() {
  return useQuery({
    queryKey: UNIT_CONVERSIONS_QUERY_KEY,
    queryFn: FetchUnitConversions,
  });
}

export function useCreateUnitConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUnitConversionInput) =>
      CreateUnitConversion(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: UNIT_CONVERSIONS_QUERY_KEY }),
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: UNIT_CONVERSIONS_QUERY_KEY }),
  });
}

export function useDeactivateUnitConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => DeactivateUnitConversion(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: UNIT_CONVERSIONS_QUERY_KEY }),
  });
}
