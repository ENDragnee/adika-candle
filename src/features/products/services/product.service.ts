import { axiosInstance } from "@/lib/axios";
import type {
  CreateProductInput,
  ProductDTO,
  UpdateProductInput,
} from "../validators/product.schema";

export async function FetchProducts(): Promise<ProductDTO[]> {
  const { data } = await axiosInstance.get<ProductDTO[]>("/api/v1/products");
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
