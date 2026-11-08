import { axiosInstance } from "@/lib/axios";
import type { Paginated, PaginationParams } from "@/lib/pagination";
import type { CostDTO, SetNewCostInput } from "../validators/cost.schema";

export async function FetchProductCosts(
  productId: string,
  params: PaginationParams = {},
): Promise<Paginated<CostDTO>> {
  const { data } = await axiosInstance.get<Paginated<CostDTO>>(
    `/api/v1/products/${productId}/costs`,
    { params },
  );
  return data;
}

export async function SetNewProductCost(
  productId: string,
  input: SetNewCostInput,
): Promise<CostDTO> {
  const { data } = await axiosInstance.post<CostDTO>(
    `/api/v1/products/${productId}/costs`,
    input,
  );
  return data;
}
