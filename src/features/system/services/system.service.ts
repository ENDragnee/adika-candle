import { axiosInstance } from "@/lib/axios";
import type {
  LogPurgePreview,
  LogPurgeResult,
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

export async function FetchLogPurgePreview(): Promise<LogPurgePreview> {
  const { data } = await axiosInstance.get<LogPurgePreview>(
    "/api/v1/system/logs/purge",
  );
  return data;
}

export async function PurgeLogs(): Promise<LogPurgeResult> {
  const { data } = await axiosInstance.post<LogPurgeResult>(
    "/api/v1/system/logs/purge",
  );
  return data;
}

// A plain link download — the browser sends the session cookie.
export function BackupUrl(includeLogs: boolean): string {
  return `/api/v1/system/backup?logs=${includeLogs ? "1" : "0"}`;
}
