"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customerQueryKey } from "@/features/customers/hooks/use-customers";
import {
  CreateLoanTransaction,
  FetchLoanAccounts,
  FetchLoanTransactions,
} from "../services/loan.service";
import type { CreateLoanTransactionInput } from "../validators/loan.schema";

export const LOAN_ACCOUNTS_QUERY_KEY = ["loans", "accounts"] as const;
export const loanTransactionsQueryKey = (accountId: string) =>
  ["loans", "transactions", accountId] as const;

export function useLoanAccounts() {
  return useQuery({
    queryKey: LOAN_ACCOUNTS_QUERY_KEY,
    queryFn: FetchLoanAccounts,
  });
}

export function useLoanTransactions(accountId: string) {
  return useQuery({
    queryKey: loanTransactionsQueryKey(accountId),
    queryFn: () => FetchLoanTransactions(accountId),
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
