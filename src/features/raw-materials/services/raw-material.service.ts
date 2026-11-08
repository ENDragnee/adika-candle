import { axiosInstance } from "@/lib/axios";
import type { Paginated, PaginationParams } from "@/lib/pagination";
import type {
  CreateRawMaterialInput,
  RawMaterialBalanceDTO,
  RawMaterialBalanceQuery,
  RawMaterialDTO,
  RawMaterialLedgerEntryDTO,
  RecordMaterialActivityInput,
  UpdateRawMaterialInput,
} from "../validators/raw-material.schema";

export type RawMaterialBalancesQueryParams = RawMaterialBalanceQuery &
  PaginationParams;

export async function FetchRawMaterials(
  params: PaginationParams = {},
): Promise<Paginated<RawMaterialDTO>> {
  const { data } = await axiosInstance.get<Paginated<RawMaterialDTO>>(
    "/api/v1/raw-materials",
    { params },
  );
  return data;
}

export async function FetchRawMaterial(id: string): Promise<RawMaterialDTO> {
  const { data } = await axiosInstance.get<RawMaterialDTO>(
    `/api/v1/raw-materials/${id}`,
  );
  return data;
}

export async function CreateRawMaterial(
  input: CreateRawMaterialInput,
): Promise<RawMaterialDTO> {
  const { data } = await axiosInstance.post<RawMaterialDTO>(
    "/api/v1/raw-materials",
    input,
  );
  return data;
}

export async function UpdateRawMaterial(
  id: string,
  input: UpdateRawMaterialInput,
): Promise<RawMaterialDTO> {
  const { data } = await axiosInstance.patch<RawMaterialDTO>(
    `/api/v1/raw-materials/${id}`,
    input,
  );
  return data;
}

export async function FetchRawMaterialBalances(
  params: RawMaterialBalancesQueryParams = {},
): Promise<Paginated<RawMaterialBalanceDTO>> {
  const { data } = await axiosInstance.get<Paginated<RawMaterialBalanceDTO>>(
    "/api/v1/raw-materials/balances",
    { params },
  );
  return data;
}

export async function FetchMaterialLedger(
  materialId: string,
  params: PaginationParams = {},
): Promise<Paginated<RawMaterialLedgerEntryDTO>> {
  const { data } = await axiosInstance.get<
    Paginated<RawMaterialLedgerEntryDTO>
  >(`/api/v1/raw-materials/${materialId}/ledger`, { params });
  return data;
}

export async function RecordMaterialActivity(
  materialId: string,
  input: RecordMaterialActivityInput,
): Promise<RawMaterialLedgerEntryDTO> {
  const { data } = await axiosInstance.post<RawMaterialLedgerEntryDTO>(
    `/api/v1/raw-materials/${materialId}/activity`,
    input,
  );
  return data;
}
