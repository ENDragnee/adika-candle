import { NextResponse } from "next/server";
import type { SetUserPasswordInput } from "@/features/users/validators/user.schema";
import { SetUserPasswordInputSchema } from "@/features/users/validators/user.schema";
import { UserName } from "@/lib/activity/names";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";
import { SetUserPassword } from "@/lib/set-user-password";

type Params = { id: string };

export const PATCH = CreateApiRoute<SetUserPasswordInput, Params>({
  moduleName: "users.password",
  schema: SetUserPasswordInputSchema,
  requiresAuth: { status: true, permission: "user:manage" },
  activity: async ({ params }) => {
    const name = await UserName(params?.id);
    return {
      type: "access",
      action: "user.password",
      message: `Set a new password for ${name}`,
      severity: "WARN",
      entityType: "user",
      entityId: params?.id,
      entityLabel: name,
    };
  },
  handler: async (body, _session, params) => {
    const userId = params?.id;

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await SetUserPassword(userId, body.password);

    return NextResponse.json({ success: true }, { status: 200 });
  },
});
