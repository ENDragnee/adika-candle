import { axiosInstance } from "@/lib/axios";
import type { Paginated, PaginationParams } from "@/lib/pagination";
import type { PriceDTO, SetNewPriceInput } from "../validators/price.schema";

export async function FetchProductPrices(
  productId: string,
  params: PaginationParams = {},
): Promise<Paginated<PriceDTO>> {
  const { data } = await axiosInstance.get<Paginated<PriceDTO>>(
    `/api/v1/products/${productId}/prices`,
    { params },
  );
  return data;
}

export async function SetNewProductPrice(
  productId: string,
  input: SetNewPriceInput,
): Promise<PriceDTO> {
  const { data } = await axiosInstance.post<PriceDTO>(
    `/api/v1/products/${productId}/prices`,
    input,
  );
  return data;
}
