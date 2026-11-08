"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AcceptStock,
  FetchProductLedger,
  FetchStockBalances,
} from "../services/stock.service";
import type { AcceptStockInput } from "../validators/stock.schema";

export const STOCK_BALANCES_QUERY_KEY = ["stock", "balances"] as const;
export const stockLedgerQueryKey = (productId: string) =>
  ["stock", "ledger", productId] as const;

export function useStockBalances() {
  return useQuery({
    queryKey: STOCK_BALANCES_QUERY_KEY,
    queryFn: FetchStockBalances,
  });
}

export function useProductLedger(productId: string) {
  return useQuery({
    queryKey: stockLedgerQueryKey(productId),
    queryFn: () => FetchProductLedger(productId),
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
