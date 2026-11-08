import { axiosInstance } from "@/lib/axios";
import type {
  CreateLoanTransactionInput,
  LoanAccountDTO,
  LoanTransactionDTO,
} from "../validators/loan.schema";

export async function FetchLoanAccounts(): Promise<LoanAccountDTO[]> {
  const { data } = await axiosInstance.get<LoanAccountDTO[]>("/api/v1/loans");
  return data;
}

export async function FetchLoanTransactions(
  accountId: string,
): Promise<LoanTransactionDTO[]> {
  const { data } = await axiosInstance.get<LoanTransactionDTO[]>(
    `/api/v1/loans/${accountId}/transactions`,
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
