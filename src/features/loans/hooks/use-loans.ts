"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { customerQueryKey } from "@/features/customers/hooks/use-customers";
import { GetErrorMessage } from "@/lib/get-error-message";
import type { PaginationParams } from "@/lib/pagination";
import { InvalidateLedgerQueries } from "@/lib/query-invalidation";
import {
  CreateLoanTransaction,
  FetchLoanAccounts,
  FetchLoanTransactions,
  type LoanAccountsQueryParams,
} from "../services/loan.service";
import type { CreateLoanTransactionInput } from "../validators/loan.schema";

export const LOAN_ACCOUNTS_QUERY_KEY = ["loans", "accounts"] as const;
export const loanAccountsQueryKey = (params: LoanAccountsQueryParams) =>
  ["loans", "accounts", params] as const;
export const loanTransactionsQueryKey = (
  accountId: string,
  params: PaginationParams = {},
) => ["loans", "transactions", accountId, params] as const;

export function useLoanAccounts(params: LoanAccountsQueryParams = {}) {
  return useQuery({
    queryKey: loanAccountsQueryKey(params),
    queryFn: () => FetchLoanAccounts(params),
    placeholderData: keepPreviousData,
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
      InvalidateLedgerQueries(queryClient);
      queryClient.invalidateQueries({
        queryKey: customerQueryKey(customerId),
      });
      toast.success("Saved to the customer's account");
    },
    onError: (error) => {
      toast.error(GetErrorMessage(error, "Couldn't record loan activity"));
    },
  });
}
