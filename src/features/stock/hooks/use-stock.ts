"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaginationParams } from "@/lib/pagination";
import {
  AcceptStock,
  FetchProductLedger,
  FetchStockBalances,
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
    onSuccess: (_entry, variables) => {
      queryClient.invalidateQueries({ queryKey: STOCK_BALANCES_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: stockLedgerQueryKey(variables.productId),
      });
    },
  });
}
