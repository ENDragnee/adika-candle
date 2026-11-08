import { axiosInstance } from "@/lib/axios";
import type { Paginated, PaginationParams } from "@/lib/pagination";
import type {
  CreateLoanTransactionInput,
  LoanAccountDTO,
  LoanTransactionDTO,
} from "../validators/loan.schema";

export async function FetchLoanAccounts(
  params: PaginationParams = {},
): Promise<Paginated<LoanAccountDTO>> {
  const { data } = await axiosInstance.get<Paginated<LoanAccountDTO>>(
    "/api/v1/loans",
    { params },
  );
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
