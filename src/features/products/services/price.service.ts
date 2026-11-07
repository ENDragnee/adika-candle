import { axiosInstance } from "@/lib/axios";
import type { PriceDTO, SetNewPriceInput } from "../validators/price.schema";

export async function FetchProductPrices(
  productId: string,
): Promise<PriceDTO[]> {
  const { data } = await axiosInstance.get<PriceDTO[]>(
    `/api/v1/products/${productId}/prices`,
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
