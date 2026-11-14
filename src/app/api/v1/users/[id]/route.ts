import { NextResponse } from "next/server";
import type {
  UpdateUserInput,
  UserDTO,
} from "@/features/users/validators/user.schema";
import {
  ToUserDTO,
  UpdateUserInputSchema,
  UserSchema,
  WITH_ROLE_INCLUDE,
} from "@/features/users/validators/user.schema";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";
import {
  AssertCanGrantRole,
  AssertCanManageUser,
} from "@/lib/server/access-containment";

type Params = { id: string };

function DescribeUpdate(body: UpdateUserInput, result: UserDTO) {
  if (body.isActive === false) {
    return {
      action: "user.deactivate",
      message: `Deactivated user ${result.name}`,
    };
  }
  if (body.isActive === true) {
    return {
      action: "user.activate",
      message: `Reactivated user ${result.name}`,
    };
  }
  if (body.roleId !== undefined) {
    return {
      action: "user.role",
      message: `Changed ${result.name}'s role to ${result.roleName ?? "none"}`,
    };
  }
  return {
    action: "user.update",
    message: `Updated ${result.name}'s name or username`,
  };
}

export const PATCH = CreateApiRoute<UpdateUserInput, Params, UserDTO>({
  moduleName: "users",
  schema: UpdateUserInputSchema,
  requiresAuth: { status: true, permission: "user:manage" },
  responseSchema: UserSchema,
  activity: ({ body, result }) => ({
    type: "access",
    ...DescribeUpdate(body, result),
    severity: "WARN",
    entityType: "user",
    entityId: result.id,
    entityLabel: result.name,
    changes: { ...body },
  }),
  handler: async (body, session, params) => {
    const userId = params?.id;
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const actorPermissions = session?.permissions ?? [];

    // Self-lockout guard: nothing else stops a Manager from deactivating
    // their own account or reassigning their own role away from
    // user:manage, leaving nobody able to fix it except by editing the DB
    // directly. See docs/DECISIONS.md, "Epic 7 decisions".
    if (userId === session?.id) {
      if (body.isActive === false) {
        return NextResponse.json(
          { error: "You can't deactivate your own account" },
          { status: 400 },
        );
      }

      if (body.roleId !== undefined) {
        return NextResponse.json(
          { error: "You can't change your own role" },
          { status: 400 },
        );
      }
    }

    // Access containment (Epic 23): the account must be within the
    // actor's reach, and so must any role it's moved to.
    await AssertCanManageUser(actorPermissions, userId);
    if (body.roleId !== undefined) {
      await AssertCanGrantRole(actorPermissions, body.roleId);
    }

    // better-auth's username plugin stores the lowercase form for lookup
    // and the typed form for display — keep both in step.
    const { username, ...rest } = body;
    const data: Prisma.UserUncheckedUpdateInput = {
      ...rest,
      ...(username !== undefined && {
        username: username.toLowerCase(),
        displayUsername: username,
      }),
    };

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data,
        include: WITH_ROLE_INCLUDE,
      });
      return ToUserDTO(user, actorPermissions);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2025") {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 },
          );
        }
        if (err.code === "P2002") {
          return NextResponse.json(
            { error: "That username is already taken", code: "DUPLICATE" },
            { status: 409 },
          );
        }
        if (err.code === "P2003") {
          return NextResponse.json(
            { error: "Role not found" },
            { status: 400 },
          );
        }
      }
      throw err;
    }
  },
});
