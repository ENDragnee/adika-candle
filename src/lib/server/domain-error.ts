import { NextResponse } from "next/server";

// A business-rule rejection raised from deep inside a service (often
// inside a $transaction, where returning a NextResponse isn't possible).
// Route handlers catch it with ToDomainErrorResponse and answer with the
// standard `{ error }` body plus a machine-readable `code` and optional
// details the UI can act on (e.g. the available stock for an oversell).
export class DomainError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function ToDomainErrorResponse(
  err: unknown,
  requestId?: string,
): NextResponse | null {
  if (!(err instanceof DomainError)) return null;
  return NextResponse.json(
    { error: err.message, code: err.code, requestId, ...err.details },
    { status: err.status },
  );
}
