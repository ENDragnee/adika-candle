import {
  ActiveSessionWhere,
  OutOfReachRoleIds,
  WithinReachUserWhere,
} from "@/features/sessions/server/session-control";
import {
  type RevokeSessionsInput,
  RevokeSessionsInputSchema,
} from "@/features/sessions/validators/session.schema";
import type { Prisma } from "@/generated/prisma/client";
import { UserName } from "@/lib/activity/names";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";
import { AssertCanManageUser } from "@/lib/server/access-containment";
import { GetApiSession } from "@/lib/session";

// Sign one person out of every device, or everyone out of every device
// (Epic 23). The caller's own current session is always kept, so they
// can't lock themselves out by accident.
export const POST = CreateApiRoute<
  RevokeSessionsInput,
  Record<string, string>,
  { revoked: number }
>({
  moduleName: "sessions",
  schema: RevokeSessionsInputSchema,
  requiresAuth: { status: true, permission: "session:manage" },
  activity: async ({ body, result }) => {
    if ("everyone" in body) {
      return {
        type: "access",
        action: "session.revoke_everyone",
        message: `Signed everyone out (${result.revoked} sessions)`,
        severity: "ERROR",
        changes: { revoked: result.revoked },
      };
    }
    const name = await UserName(body.userId);
    return {
      type: "access",
      action: "session.revoke_user",
      message: `Signed ${name} out of every device (${result.revoked} sessions)`,
      severity: "WARN",
      entityType: "user",
      entityId: body.userId,
      entityLabel: name,
      changes: { revoked: result.revoked },
    };
  },
  handler: async (body, session) => {
    const actorPermissions = session?.permissions ?? [];
    const currentSessionId = (await GetApiSession())?.session.id;
    const keepCurrent: Prisma.SessionWhereInput = currentSessionId
      ? { id: { not: currentSessionId } }
      : {};

    let where: Prisma.SessionWhereInput;
    if ("everyone" in body) {
      where = {
        ...ActiveSessionWhere(),
        ...keepCurrent,
        user: WithinReachUserWhere(await OutOfReachRoleIds(actorPermissions)),
      };
    } else {
      await AssertCanManageUser(actorPermissions, body.userId);
      where = { userId: body.userId, ...keepCurrent };
    }

    const { count } = await prisma.session.deleteMany({ where });
    return { revoked: count };
  },
});
