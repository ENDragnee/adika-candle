import { isAxiosError } from "axios";

// Every API route (CreateApiRoute, src/lib/api-handlers/rest.handler.ts)
// answers a failure with `{ error, code?, requestId?, ...details }`. This
// is the single place that unwraps it, so every toast, inline message and
// error dialog shows the server's actual reason.

export interface ApiErrorInfo {
  message: string;
  // e.g. "UNAUTHENTICATED", "FORBIDDEN", "INSUFFICIENT_STOCK", "NETWORK".
  code: string | null;
  status: number | null;
  // The x-request-id of the failed request — the reference a person can
  // quote when reporting the problem.
  requestId: string | null;
}

export function ParseApiError(error: unknown, fallback: string): ApiErrorInfo {
  if (isAxiosError(error)) {
    if (!error.response) {
      return {
        message: "Can't reach the server. Check your connection and try again.",
        code: "NETWORK",
        status: null,
        requestId: null,
      };
    }
    const data = error.response.data as
      | { error?: string; code?: string; requestId?: string }
      | undefined;
    return {
      message: data?.error ?? fallback,
      code: data?.code ?? null,
      status: error.response.status,
      requestId:
        data?.requestId ??
        (error.response.headers?.["x-request-id"] as string | undefined) ??
        null,
    };
  }
  return {
    message: fallback,
    code: null,
    status: null,
    requestId: null,
  };
}

export function GetErrorMessage(error: unknown, fallback: string): string {
  return ParseApiError(error, fallback).message;
}
