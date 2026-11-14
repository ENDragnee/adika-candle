import {
  PreviewLogPurge,
  PurgeOldLogs,
} from "@/features/system/server/retention";
import {
  LogPurgePreviewSchema,
  LogPurgeResultSchema,
} from "@/features/system/validators/system.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";

// How many activity-log entries the current retention window would remove.
export const GET = CreateApiRoute({
  moduleName: "system.logs",
  requiresAuth: { status: true, permission: "system:manage" },
  responseSchema: LogPurgePreviewSchema,
  handler: async () => PreviewLogPurge(),
});

// Remove them (Epic 24). Recorded after the delete, so the entry survives.
export const POST = CreateApiRoute({
  moduleName: "system.logs",
  requiresAuth: { status: true, permission: "system:manage" },
  responseSchema: LogPurgeResultSchema,
  activity: ({ result }) => ({
    type: "system",
    action: "system.logs_purged",
    message: `Purged ${result.deleted} activity entries older than ${result.cutoff.slice(0, 10)}`,
    severity: "WARN",
    changes: { ...result },
  }),
  handler: async () => PurgeOldLogs(),
});
