import { axiosInstance } from "@/lib/axios";
import type { Paginated, PaginationParams } from "@/lib/pagination";
import type {
  CreateUnitConversionInput,
  UnitConversionDTO,
  UpdateUnitConversionInput,
} from "../validators/unit-conversion.schema";

export async function FetchUnitConversions(
  params: PaginationParams = {},
): Promise<Paginated<UnitConversionDTO>> {
  const { data } = await axiosInstance.get<Paginated<UnitConversionDTO>>(
    "/api/v1/unit-conversions",
    { params },
  );
  return data;
}

export async function CreateUnitConversion(
  input: CreateUnitConversionInput,
): Promise<UnitConversionDTO> {
  const { data } = await axiosInstance.post<UnitConversionDTO>(
    "/api/v1/unit-conversions",
    input,
  );
  return data;
}

export async function UpdateUnitConversion(
  id: string,
  input: UpdateUnitConversionInput,
): Promise<UnitConversionDTO> {
  const { data } = await axiosInstance.patch<UnitConversionDTO>(
    `/api/v1/unit-conversions/${id}`,
    input,
  );
  return data;
}

export async function DeactivateUnitConversion(id: string): Promise<void> {
  await axiosInstance.delete(`/api/v1/unit-conversions/${id}`);
}
