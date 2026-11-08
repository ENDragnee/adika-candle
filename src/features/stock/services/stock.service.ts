import { axiosInstance } from "@/lib/axios";
import type {
  AcceptStockInput,
  StockBalanceDTO,
  StockLedgerEntryDTO,
} from "../validators/stock.schema";

export async function FetchStockBalances(): Promise<StockBalanceDTO[]> {
  const { data } = await axiosInstance.get<StockBalanceDTO[]>("/api/v1/stock");
  return data;
}

export async function FetchProductLedger(
  productId: string,
): Promise<StockLedgerEntryDTO[]> {
  const { data } = await axiosInstance.get<StockLedgerEntryDTO[]>(
    `/api/v1/stock/${productId}/ledger`,
  );
  return data;
}

export async function AcceptStock(
  input: AcceptStockInput,
): Promise<StockLedgerEntryDTO> {
  const { data } = await axiosInstance.post<StockLedgerEntryDTO>(
    "/api/v1/stock/accept",
    input,
  );
  return data;
}
