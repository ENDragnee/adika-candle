"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { PaginationParams } from "@/lib/pagination";
import {
  FetchProductPrices,
  SetNewProductPrice,
} from "../services/price.service";
import type { SetNewPriceInput } from "../validators/price.schema";
import { PRODUCTS_QUERY_KEY, productQueryKey } from "./use-products";

export const productPricesQueryKey = (
  productId: string,
  params: PaginationParams = {},
) => ["products", productId, "prices", params] as const;

export function useProductPrices(
  productId: string,
  params: PaginationParams = {},
) {
  return useQuery({
    queryKey: productPricesQueryKey(productId, params),
    queryFn: () => FetchProductPrices(productId, params),
    enabled: Boolean(productId),
  });
}

export function useSetNewProductPrice(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetNewPriceInput) =>
      SetNewProductPrice(productId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productPricesQueryKey(productId),
      });
      queryClient.invalidateQueries({
        queryKey: productQueryKey(productId),
      });
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      // Margin and "no price/cost" attention items depend on this.
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("New price set");
    },
    meta: { errorTitle: "Couldn't set new price" },
  });
}
