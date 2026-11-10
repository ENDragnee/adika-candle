import { isAxiosError } from "axios";

// Every API route in this app (CreateApiRoute, src/lib/api-handlers/
// rest.handler.ts) returns `{ error: string }` on every non-2xx response —
// validation failures, domain conflicts (e.g. "A unit with that name
// already exists"), not-found, and the generic 500 fallback all use this
// one shape. This is the single place that unwraps it, so a toast/inline
// error message shows the server's actual reason instead of a hand-typed
// guess that can drift from what the API really says.
export function GetErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
  }
  return fallback;
}
