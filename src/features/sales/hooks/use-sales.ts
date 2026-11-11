"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { GetErrorMessage } from "@/lib/get-error-message";
import { InvalidateLedgerQueries } from "@/lib/query-invalidation";
import {
  CreateSale,
  FetchSale,
  FetchSales,
  type SalesQueryParams,
  VoidSale,
} from "../services/sale.service";
import type { CreateSaleInput, VoidSaleInput } from "../validators/sale.schema";

export const salesQueryKey = (query?: SalesQueryParams) =>
  ["sales", query ?? {}] as const;
export const saleQueryKey = (id: string) => ["sales", "detail", id] as const;

export function useSales(query?: SalesQueryParams) {
  return useQuery({
    queryKey: salesQueryKey(query),
    queryFn: () => FetchSales(query),
    // Keep the current rows on screen while a new filter/page loads.
    placeholderData: keepPreviousData,
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: saleQueryKey(id),
    queryFn: () => FetchSale(id),
    enabled: Boolean(id),
  });
}

// Errors are left to the caller: the Record Sale dialog handles the
// INSUFFICIENT_STOCK answer itself (it asks the user to confirm) and
// toasts everything else.
export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSaleInput) => CreateSale(input),
    onSuccess: () => {
      InvalidateLedgerQueries(queryClient);
      toast.success("Sale recorded");
    },
  });
}

export function useVoidSale(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: VoidSaleInput) => VoidSale(id, input),
    onSuccess: (sale) => {
      InvalidateLedgerQueries(queryClient);
      toast.success(`Sale ${sale.referenceCode} voided`);
    },
    onError: (error) => {
      toast.error(GetErrorMessage(error, "Couldn't void sale"));
    },
  });
}
