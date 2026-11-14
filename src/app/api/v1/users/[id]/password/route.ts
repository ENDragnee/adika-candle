import { NextResponse } from "next/server";
import type { SetUserPasswordInput } from "@/features/users/validators/user.schema";
import { SetUserPasswordInputSchema } from "@/features/users/validators/user.schema";
import { UserName } from "@/lib/activity/names";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { FailedPasswordRules } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { AssertCanManageUser } from "@/lib/server/access-containment";
import { GetApiSession } from "@/lib/session";
import { SetUserPassword } from "@/lib/set-user-password";

type Params = { id: string };

export const PATCH = CreateApiRoute<SetUserPasswordInput, Params>({
  moduleName: "users.password",
  schema: SetUserPasswordInputSchema,
  requiresAuth: { status: true, permission: "user:manage" },
  activity: async ({ body, result, params }) => {
    const name = await UserName(params?.id);
    return {
      type: "access",
      action: "user.password",
      message: `Set a new password for ${name}`,
      severity: "WARN",
      entityType: "user",
      entityId: params?.id,
      entityLabel: name,
      changes: {
        signedOutEverywhere: body.signOutEverywhere,
        sessionsEnded: result.signedOutSessions,
      },
    };
  },
  handler: async (body, session, params) => {
    const userId = params?.id;

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Setting someone's password lets you sign in as them, so their
    // account must be within your reach (Epic 23).
    await AssertCanManageUser(session?.permissions ?? [], userId);

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const personal = FailedPasswordRules(body.password, {
      personal: [user.name, user.username, user.email],
    });
    if (personal.length > 0) {
      return NextResponse.json(
        {
          error: `Password: ${personal[0].label}`,
          code: "WEAK_PASSWORD",
        },
        { status: 400 },
      );
    }

    await SetUserPassword(userId, body.password);

    // The signed-in Manager resetting their *own* password keeps the
    // session they're using; every other session ends.
    let signedOutSessions = 0;
    if (body.signOutEverywhere) {
      const currentSessionId = (await GetApiSession())?.session.id;
      const { count } = await prisma.session.deleteMany({
        where: {
          userId,
          ...(userId === session?.id && currentSessionId
            ? { id: { not: currentSessionId } }
            : {}),
        },
      });
      signedOutSessions = count;
    }

    return { success: true, signedOutSessions };
  },
});
