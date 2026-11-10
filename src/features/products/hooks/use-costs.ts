"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GetErrorMessage } from "@/lib/get-error-message";
import type { PaginationParams } from "@/lib/pagination";
import { FetchProductCosts, SetNewProductCost } from "../services/cost.service";
import type { SetNewCostInput } from "../validators/cost.schema";
import { PRODUCTS_QUERY_KEY, productQueryKey } from "./use-products";

export const productCostsQueryKey = (
  productId: string,
  params: PaginationParams = {},
) => ["products", productId, "costs", params] as const;

export function useProductCosts(
  productId: string,
  params: PaginationParams = {},
) {
  return useQuery({
    queryKey: productCostsQueryKey(productId, params),
    queryFn: () => FetchProductCosts(productId, params),
    enabled: Boolean(productId),
  });
}

export function useSetNewProductCost(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetNewCostInput) => SetNewProductCost(productId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productCostsQueryKey(productId),
      });
      queryClient.invalidateQueries({
        queryKey: productQueryKey(productId),
      });
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      toast.success("New cost set");
    },
    onError: (error) => {
      toast.error(GetErrorMessage(error, "Couldn't set new cost"));
    },
  });
}
