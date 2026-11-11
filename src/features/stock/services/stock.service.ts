import { axiosInstance } from "@/lib/axios";
import type { Paginated, PaginationParams } from "@/lib/pagination";
import type {
  AcceptStockInput,
  StockBalanceDTO,
  StockBalanceQuery,
  StockLedgerEntryDTO,
} from "../validators/stock.schema";

export type StockBalancesQueryParams = StockBalanceQuery & PaginationParams;

export async function FetchStockBalances(
  params: StockBalancesQueryParams = {},
): Promise<Paginated<StockBalanceDTO>> {
  const { data } = await axiosInstance.get<Paginated<StockBalanceDTO>>(
    "/api/v1/stock",
    { params },
  );
  return data;
}

export async function FetchProductLedger(
  productId: string,
  params: PaginationParams = {},
): Promise<Paginated<StockLedgerEntryDTO>> {
  const { data } = await axiosInstance.get<Paginated<StockLedgerEntryDTO>>(
    `/api/v1/stock/${productId}/ledger`,
    { params },
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
