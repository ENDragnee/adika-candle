import { axiosInstance } from "@/lib/axios";
import type { Paginated, PaginationParams } from "@/lib/pagination";
import type {
  CreateSaleInput,
  SaleDTO,
  SaleQuery,
  SalesSummaryDTO,
  VoidSaleInput,
} from "../validators/sale.schema";

export type SalesQueryParams = SaleQuery & PaginationParams;

// The list response also carries totals for the whole filtered set (not
// just the page) — see GET /api/v1/sales.
export type SalesPage = Paginated<SaleDTO> & { summary: SalesSummaryDTO };

export async function FetchSales(
  query: SalesQueryParams = {},
): Promise<SalesPage> {
  const { data } = await axiosInstance.get<SalesPage>("/api/v1/sales", {
    params: query,
  });
  return data;
}

export async function FetchSale(id: string): Promise<SaleDTO> {
  const { data } = await axiosInstance.get<SaleDTO>(`/api/v1/sales/${id}`);
  return data;
}

export async function CreateSale(input: CreateSaleInput): Promise<SaleDTO> {
  const { data } = await axiosInstance.post<SaleDTO>("/api/v1/sales", input);
  return data;
}

export async function VoidSale(
  id: string,
  input: VoidSaleInput,
): Promise<SaleDTO> {
  const { data } = await axiosInstance.post<SaleDTO>(
    `/api/v1/sales/${id}/void`,
    input,
  );
  return data;
}
