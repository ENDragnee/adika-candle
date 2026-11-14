import { ActiveSessionWhere } from "@/features/sessions/server/session-control";
import { SessionSummarySchema } from "@/features/sessions/validators/session.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

// The Admin's system panel on the dashboard (Epic 23): who's signed in,
// how many accounts are enabled, and failed sign-ins in the last day.
export const GET = CreateApiRoute({
  moduleName: "sessions.summary",
  requiresAuth: { status: true, permission: "session:manage" },
  responseSchema: SessionSummarySchema,
  handler: async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const failedWhere = {
      action: "auth.sign_in_failed",
      createdAt: { gte: since },
    };
    const [
      activeSessions,
      signedIn,
      activeUsers,
      inactiveUsers,
      failedSignIns24h,
      lastFailed,
    ] = await Promise.all([
      prisma.session.count({ where: ActiveSessionWhere() }),
      prisma.session.groupBy({ by: ["userId"], where: ActiveSessionWhere() }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.log.count({ where: failedWhere }),
      prisma.log.findFirst({
        where: { action: "auth.sign_in_failed" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);
    return {
      activeSessions,
      signedInUsers: signedIn.length,
      activeUsers,
      inactiveUsers,
      failedSignIns24h,
      lastFailedSignInAt: lastFailed?.createdAt.toISOString() ?? null,
    };
  },
});
