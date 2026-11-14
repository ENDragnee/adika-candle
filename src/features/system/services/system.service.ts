import { axiosInstance } from "@/lib/axios";
import type {
  SystemSettings,
  UpdateSystemSettingsInput,
} from "../validators/system.schema";

export async function FetchSystemSettings(): Promise<SystemSettings> {
  const { data } = await axiosInstance.get<SystemSettings>(
    "/api/v1/system/settings",
  );
  return data;
}

export async function UpdateSystemSettings(
  input: UpdateSystemSettingsInput,
): Promise<SystemSettings> {
  const { data } = await axiosInstance.patch<SystemSettings>(
    "/api/v1/system/settings",
    input,
  );
  return data;
}
