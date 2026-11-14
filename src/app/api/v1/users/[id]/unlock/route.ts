import {
  ToUserDTO,
  type UserDTO,
  UserSchema,
  WITH_ROLE_INCLUDE,
} from "@/features/users/validators/user.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";
import { AssertCanManageUser } from "@/lib/server/access-containment";

type Params = { id: string };

// Lift a sign-in lockout early (Epic 24).
export const POST = CreateApiRoute<unknown, Params, UserDTO>({
  moduleName: "users.unlock",
  requiresAuth: { status: true, permission: "system:manage" },
  responseSchema: UserSchema,
  activity: ({ result }) => ({
    type: "access",
    action: "user.unlock",
    message: `Unlocked ${result.name}'s account`,
    severity: "WARN",
    entityType: "user",
    entityId: result.id,
    entityLabel: result.name,
  }),
  handler: async (_body, session, params) => {
    const userId = params?.id ?? "";
    await AssertCanManageUser(session?.permissions ?? [], userId);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: null, failedSignInCount: 0 },
      include: WITH_ROLE_INCLUDE,
    });
    return ToUserDTO(user, session?.permissions ?? []);
  },
});
