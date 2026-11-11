import { axiosInstance } from "@/lib/axios";
import type {
  CreateMaterialRequirementInput,
  ProductMaterialRequirementDTO,
  UpdateMaterialRequirementInput,
} from "../validators/material-requirement.schema";

export async function FetchMaterialRequirements(
  productId: string,
): Promise<ProductMaterialRequirementDTO[]> {
  const { data } = await axiosInstance.get<ProductMaterialRequirementDTO[]>(
    `/api/v1/products/${productId}/material-requirements`,
  );
  return data;
}

export async function CreateMaterialRequirement(
  productId: string,
  input: CreateMaterialRequirementInput,
): Promise<ProductMaterialRequirementDTO> {
  const { data } = await axiosInstance.post<ProductMaterialRequirementDTO>(
    `/api/v1/products/${productId}/material-requirements`,
    input,
  );
  return data;
}

export async function UpdateMaterialRequirement(
  productId: string,
  input: UpdateMaterialRequirementInput,
): Promise<ProductMaterialRequirementDTO> {
  const { data } = await axiosInstance.patch<ProductMaterialRequirementDTO>(
    `/api/v1/products/${productId}/material-requirements`,
    input,
  );
  return data;
}
