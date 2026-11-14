import { z } from "zod";
import { RevokeResultSchema } from "@/features/sessions/validators/session.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";
import { AssertCanManageUser } from "@/lib/server/access-containment";
import { DomainError } from "@/lib/server/domain-error";
import { GetApiSession } from "@/lib/session";

type Params = { id: string };

// End one session (Epic 23): that device is signed out on its next
// request.
export const DELETE = CreateApiRoute<
  unknown,
  Params,
  { revoked: number; userId: string; userName: string }
>({
  moduleName: "sessions",
  requiresAuth: { status: true, permission: "session:manage" },
  responseSchema: RevokeResultSchema.extend({
    userId: z.string(),
    userName: z.string(),
  }),
  activity: ({ result }) => ({
    type: "access",
    action: "session.revoke",
    message: `Signed ${result.userName} out of one device`,
    severity: "WARN",
    entityType: "user",
    entityId: result.userId,
    entityLabel: result.userName,
  }),
  handler: async (_body, session, params) => {
    const target = params?.id
      ? await prisma.session.findUnique({
          where: { id: params.id },
          select: { id: true, userId: true, user: { select: { name: true } } },
        })
      : null;
    if (!target) {
      throw new DomainError("That session has already ended", 404, "NOT_FOUND");
    }

    const current = await GetApiSession();
    if (target.id === current?.session.id) {
      throw new DomainError(
        "This is the session you're using — sign out instead",
        400,
        "CURRENT_SESSION",
      );
    }
    await AssertCanManageUser(session?.permissions ?? [], target.userId);

    const { count } = await prisma.session.deleteMany({
      where: { id: target.id },
    });
    return {
      revoked: count,
      userId: target.userId,
      userName: target.user.name,
    };
  },
});
