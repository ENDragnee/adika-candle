"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customerQueryKey } from "@/features/customers/hooks/use-customers";
import type { PaginationParams } from "@/lib/pagination";
import {
  CreateLoanTransaction,
  FetchLoanAccounts,
  FetchLoanTransactions,
} from "../services/loan.service";
import type { CreateLoanTransactionInput } from "../validators/loan.schema";

export const LOAN_ACCOUNTS_QUERY_KEY = ["loans", "accounts"] as const;
export const loanAccountsQueryKey = (params: PaginationParams) =>
  ["loans", "accounts", params] as const;
export const loanTransactionsQueryKey = (
  accountId: string,
  params: PaginationParams = {},
) => ["loans", "transactions", accountId, params] as const;

export function useLoanAccounts(params: PaginationParams = {}) {
  return useQuery({
    queryKey: loanAccountsQueryKey(params),
    queryFn: () => FetchLoanAccounts(params),
  });
}

export function useLoanTransactions(
  accountId: string,
  params: PaginationParams = {},
) {
  return useQuery({
    queryKey: loanTransactionsQueryKey(accountId, params),
    queryFn: () => FetchLoanTransactions(accountId, params),
    enabled: Boolean(accountId),
  });
}

export function useCreateLoanTransaction(
  accountId: string,
  customerId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLoanTransactionInput) =>
      CreateLoanTransaction(accountId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: loanTransactionsQueryKey(accountId),
      });
      queryClient.invalidateQueries({ queryKey: LOAN_ACCOUNTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: customerQueryKey(customerId),
      });
    },
  });
}
