import { axiosInstance } from "@/lib/axios";
import type { Paginated, PaginationParams } from "@/lib/pagination";
import type {
  CreateLoanTransactionInput,
  LoanAccountDTO,
  LoanAccountQuery,
  LoanTransactionDTO,
  ReceivablesSummaryDTO,
} from "../validators/loan.schema";

export type LoanAccountsQueryParams = LoanAccountQuery & PaginationParams;

// The list response also carries totals for the whole book — see
// GET /api/v1/loans.
export type LoanAccountsPage = Paginated<LoanAccountDTO> & {
  summary: ReceivablesSummaryDTO;
};

export async function FetchLoanAccounts(
  params: LoanAccountsQueryParams = {},
): Promise<LoanAccountsPage> {
  const { data } = await axiosInstance.get<LoanAccountsPage>("/api/v1/loans", {
    params,
  });
  return data;
}

export async function FetchLoanTransactions(
  accountId: string,
  params: PaginationParams = {},
): Promise<Paginated<LoanTransactionDTO>> {
  const { data } = await axiosInstance.get<Paginated<LoanTransactionDTO>>(
    `/api/v1/loans/${accountId}/transactions`,
    { params },
  );
  return data;
}

export async function CreateLoanTransaction(
  accountId: string,
  input: CreateLoanTransactionInput,
): Promise<LoanTransactionDTO> {
  const { data } = await axiosInstance.post<LoanTransactionDTO>(
    `/api/v1/loans/${accountId}/transactions`,
    input,
  );
  return data;
}
