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

type Params = { id: string };

export const PATCH = CreateApiRoute<UpdateUserInput, Params, UserDTO>({
  moduleName: "users",
  schema: UpdateUserInputSchema,
  requiresAuth: { status: true, permission: "user:manage" },
  responseSchema: UserSchema,
  handler: async (body, session, params) => {
    // Self-lockout guard: nothing else stops a Manager from deactivating
    // their own account or reassigning their own role away from
    // user:manage, leaving nobody able to fix it except by editing the DB
    // directly. See docs/DECISIONS.md, "Epic 7 decisions".
    if (params?.id === session?.id) {
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

    try {
      const user = await prisma.user.update({
        where: { id: params?.id },
        data: body,
        include: WITH_ROLE_INCLUDE,
      });
      return ToUserDTO(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2025") {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 },
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
