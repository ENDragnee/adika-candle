import { axiosInstance } from "@/lib/axios";
import type { Paginated } from "@/lib/pagination";
import type {
  RevokeResult,
  RevokeSessionsInput,
  SessionDTO,
  SessionQuery,
  SessionSummary,
} from "../validators/session.schema";

export async function FetchSessions(
  params: SessionQuery = {},
): Promise<Paginated<SessionDTO>> {
  const { data } = await axiosInstance.get<Paginated<SessionDTO>>(
    "/api/v1/sessions",
    { params },
  );
  return data;
}

export async function FetchSessionSummary(): Promise<SessionSummary> {
  const { data } = await axiosInstance.get<SessionSummary>(
    "/api/v1/sessions/summary",
  );
  return data;
}

export async function RevokeSession(id: string): Promise<RevokeResult> {
  const { data } = await axiosInstance.delete<RevokeResult>(
    `/api/v1/sessions/${id}`,
  );
  return data;
}

export async function RevokeSessions(
  input: RevokeSessionsInput,
): Promise<RevokeResult> {
  const { data } = await axiosInstance.post<RevokeResult>(
    "/api/v1/sessions/revoke",
    input,
  );
  return data;
}
