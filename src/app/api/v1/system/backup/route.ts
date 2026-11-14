import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BuildBackup } from "@/features/system/server/backup";
import { RecordActivity, RequestContext } from "@/lib/activity/record-activity";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { BusinessDateKey } from "@/lib/business-time";

const BackupQuerySchema = z.object({
  logs: z.enum(["0", "1"]).default("0"),
});

// Download a full JSON backup (Epic 24). A GET, so the browser can
// download it straight from a link; logged by hand because the activity
// hook only covers mutations.
export const GET = CreateApiRoute({
  moduleName: "system.backup",
  schema: BackupQuerySchema,
  requiresAuth: { status: true, permission: "system:manage" },
  handler: async (query, session) => {
    const includeLogs = query.logs === "1";
    const backup = await BuildBackup({
      includeLogs,
      createdBy: session?.name ?? "unknown",
    });
    const total = Object.values(backup.counts).reduce((a, b) => a + b, 0);

    await RecordActivity(
      {
        type: "system",
        action: "system.backup",
        message: `Downloaded a backup (${total} records${includeLogs ? ", with activity log" : ""})`,
        severity: "WARN",
        changes: { counts: backup.counts },
      },
      {
        userId: session?.id,
        ...RequestContext(await headers()),
      },
    );

    const filename = `adika-candle-backup-${BusinessDateKey(new Date())}.json`;
    return new NextResponse(JSON.stringify(backup), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  },
});
