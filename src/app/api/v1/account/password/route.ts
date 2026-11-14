import {
  type ChangeOwnPasswordInput,
  ChangeOwnPasswordInputSchema,
} from "@/features/system/validators/account.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { auth } from "@/lib/auth";
import { FailedPasswordRules } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/server/domain-error";
import { GetApiSession } from "@/lib/session";
import { SetUserPassword } from "@/lib/set-user-password";

// Change your own password (Epic 24). Open to any signed-in user —
// including one whose permissions are withheld until they do exactly this
// (mustChangePassword). Ends their other sessions; this one stays.
export const POST = CreateApiRoute<ChangeOwnPasswordInput>({
  moduleName: "account.password",
  schema: ChangeOwnPasswordInputSchema,
  requiresAuth: { status: true, permission: null },
  activity: ({ session }) => ({
    type: "access",
    action: "account.password",
    message: `${session?.name ?? "Someone"} changed their own password`,
    entityType: "user",
    entityId: session?.id,
    entityLabel: session?.name,
  }),
  handler: async (body, session) => {
    const userId = session?.id;
    if (!userId) {
      throw new DomainError("Please sign in again", 401, "UNAUTHENTICATED");
    }

    const ctx = await auth.$context;
    const account = await ctx.internalAdapter.findCredentialAccount(userId);
    const valid =
      !!account?.password &&
      (await ctx.password.verify({
        hash: account.password,
        password: body.currentPassword,
      }));
    if (!valid) {
      throw new DomainError(
        "Your current password isn't right",
        400,
        "WRONG_PASSWORD",
      );
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, username: true, email: true },
    });
    const personal = FailedPasswordRules(body.password, {
      personal: [user.name, user.username, user.email],
    });
    if (personal.length > 0) {
      throw new DomainError(
        `Password: ${personal[0].label}`,
        400,
        "WEAK_PASSWORD",
      );
    }

    await SetUserPassword(userId, body.password);
    const currentSessionId = (await GetApiSession())?.session.id;
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { mustChangePassword: false },
      }),
      prisma.session.deleteMany({
        where: {
          userId,
          ...(currentSessionId && { id: { not: currentSessionId } }),
        },
      }),
    ]);
    return { success: true };
  },
});
