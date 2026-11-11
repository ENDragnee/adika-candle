"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GetErrorMessage } from "@/lib/get-error-message";
import {
  CreateSale,
  FetchSale,
  FetchSales,
  type SalesQueryParams,
} from "../services/sale.service";
import type { CreateSaleInput } from "../validators/sale.schema";

export const salesQueryKey = (query?: SalesQueryParams) =>
  ["sales", query ?? {}] as const;
export const saleQueryKey = (id: string) => ["sales", "detail", id] as const;

export function useSales(query?: SalesQueryParams) {
  return useQuery({
    queryKey: salesQueryKey(query),
    queryFn: () => FetchSales(query),
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: saleQueryKey(id),
    queryFn: () => FetchSale(id),
    enabled: Boolean(id),
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSaleInput) => CreateSale(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      toast.success("Sale recorded");
    },
    onError: (error) => {
      toast.error(GetErrorMessage(error, "Couldn't record sale"));
    },
  });
}
