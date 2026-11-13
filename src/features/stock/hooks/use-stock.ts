"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GetErrorMessage } from "@/lib/get-error-message";
import type { PaginationParams } from "@/lib/pagination";
import { InvalidateLedgerQueries } from "@/lib/query-invalidation";
import type { StockCountInput } from "@/lib/schemas/stock-count.schema";
import {
  AcceptStock,
  FetchProductLedger,
  FetchStockBalances,
  RecordStockCount,
  type StockBalancesQueryParams,
} from "../services/stock.service";
import type { AcceptStockInput } from "../validators/stock.schema";

export const STOCK_BALANCES_QUERY_KEY = ["stock", "balances"] as const;
export const stockBalancesQueryKey = (params: StockBalancesQueryParams) =>
  ["stock", "balances", params] as const;
export const stockLedgerQueryKey = (
  productId: string,
  params: PaginationParams = {},
) => ["stock", "ledger", productId, params] as const;

export function useStockBalances(params: StockBalancesQueryParams = {}) {
  return useQuery({
    queryKey: stockBalancesQueryKey(params),
    queryFn: () => FetchStockBalances(params),
  });
}

export function useProductLedger(
  productId: string,
  params: PaginationParams = {},
) {
  return useQuery({
    queryKey: stockLedgerQueryKey(productId, params),
    queryFn: () => FetchProductLedger(productId, params),
    enabled: Boolean(productId),
  });
}

export function useAcceptStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AcceptStockInput) => AcceptStock(input),
    onSuccess: () => {
      InvalidateLedgerQueries(queryClient);
      toast.success("Stock accepted");
    },
    onError: (error) => {
      toast.error(GetErrorMessage(error, "Couldn't accept stock"));
    },
  });
}

export function useRecordStockCount(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StockCountInput) => RecordStockCount(productId, input),
    onSuccess: () => {
      InvalidateLedgerQueries(queryClient);
      toast.success("Stock count recorded");
    },
    onError: (error) => {
      toast.error(GetErrorMessage(error, "Couldn't record the stock count"));
    },
  });
}
