import { axiosInstance } from "@/lib/axios";
import type { Paginated, PaginationParams } from "@/lib/pagination";
import type {
  CreateProductInput,
  ProductDTO,
  UpdateProductInput,
} from "../validators/product.schema";

export async function FetchProducts(
  params: PaginationParams = {},
): Promise<Paginated<ProductDTO>> {
  const { data } = await axiosInstance.get<Paginated<ProductDTO>>(
    "/api/v1/products",
    { params },
  );
  return data;
}

export async function FetchProduct(id: string): Promise<ProductDTO> {
  const { data } = await axiosInstance.get<ProductDTO>(
    `/api/v1/products/${id}`,
  );
  return data;
}

export async function CreateProduct(
  input: CreateProductInput,
): Promise<ProductDTO> {
  const { data } = await axiosInstance.post<ProductDTO>(
    "/api/v1/products",
    input,
  );
  return data;
}

export async function UpdateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<ProductDTO> {
  const { data } = await axiosInstance.patch<ProductDTO>(
    `/api/v1/products/${id}`,
    input,
  );
  return data;
}
