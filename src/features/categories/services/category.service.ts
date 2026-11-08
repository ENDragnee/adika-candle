import { axiosInstance } from "@/lib/axios";
import type { Paginated, PaginationParams } from "@/lib/pagination";
import type {
  CategoryDTO,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../validators/category.schema";

export async function FetchCategories(
  params: PaginationParams = {},
): Promise<Paginated<CategoryDTO>> {
  const { data } = await axiosInstance.get<Paginated<CategoryDTO>>(
    "/api/v1/categories",
    { params },
  );
  return data;
}

export async function CreateCategory(
  input: CreateCategoryInput,
): Promise<CategoryDTO> {
  const { data } = await axiosInstance.post<CategoryDTO>(
    "/api/v1/categories",
    input,
  );
  return data;
}

export async function UpdateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<CategoryDTO> {
  const { data } = await axiosInstance.patch<CategoryDTO>(
    `/api/v1/categories/${id}`,
    input,
  );
  return data;
}

export async function DeactivateCategory(id: string): Promise<void> {
  await axiosInstance.delete(`/api/v1/categories/${id}`);
}
