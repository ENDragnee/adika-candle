import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// One activity-log entry (Epic 22). See the Log model in schema.prisma.
export interface ActivityInput {
  type: string;
  action: string;
  message: string;
  severity?: "INFO" | "WARN" | "ERROR";
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  changes?: Record<string, unknown>;
}

export interface ActivityContext {
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// Keys whose values must never reach the log, at any nesting depth.
const SECRET_KEY_PATTERN = /pass(word)?|secret|token|hash/i;

export function RedactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(RedactSecrets);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? "[redacted]" : RedactSecrets(item),
      ]),
    );
  }
  return value;
}

export function RequestContext(
  headers: Headers,
): Omit<ActivityContext, "userId"> {
  return {
    // First hop of x-forwarded-for is the client when behind a proxy.
    ipAddress:
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers.get("x-real-ip") ??
      null,
    userAgent: headers.get("user-agent"),
  };
}

// Best-effort by design: the change it describes has already committed,
// so a failure to log is reported to the server log but never turns a
// successful request into an error for the person who made it. See
// docs/DECISIONS.md, "Epic 22 decisions".
export async function RecordActivity(
  input: ActivityInput,
  context: ActivityContext,
): Promise<void> {
  try {
    await prisma.log.create({
      data: {
        type: input.type,
        action: input.action,
        message: input.message.slice(0, 500),
        severity: input.severity ?? "INFO",
        entityType: input.entityType,
        entityId: input.entityId,
        entityLabel: input.entityLabel?.slice(0, 200),
        changes: input.changes
          ? (RedactSecrets(input.changes) as Prisma.InputJsonValue)
          : undefined,
        ipAddress: context.ipAddress ?? undefined,
        userAgent: context.userAgent?.slice(0, 300) ?? undefined,
        userId: context.userId ?? undefined,
      },
    });
  } catch (err) {
    // console, not the pino logger: this module is also loaded by
    // better-auth's hooks inside page renders, where pino's pretty-print
    // transport can't start (it spawns a worker thread).
    console.error("Failed to record activity", input.action, err);
  }
}
