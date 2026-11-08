import { axiosInstance } from "@/lib/axios";
import type {
  CreateSaleInput,
  SaleDTO,
  SaleQuery,
} from "../validators/sale.schema";

export async function FetchSales(query?: SaleQuery): Promise<SaleDTO[]> {
  const { data } = await axiosInstance.get<SaleDTO[]>("/api/v1/sales", {
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
