import { APIError } from "better-auth";
import { NextResponse } from "next/server";
import { GenerateTemporaryPassword } from "@/features/users/services/generate-temporary-password.service";
import {
  CreateUserInputSchema,
  CreateUserResponseSchema,
  ToUserDTO,
  UserSchema,
  WITH_ROLE_INCLUDE,
} from "@/features/users/validators/user.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { auth } from "@/lib/auth";
import {
  BuildPaginationMeta,
  PaginatedResponseSchema,
  PaginationQuerySchema,
  ToSkipTake,
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

export const GET = CreateApiRoute({
  moduleName: "users",
  schema: PaginationQuerySchema,
  requiresAuth: { status: true, permission: "user:manage" },
  responseSchema: PaginatedResponseSchema(UserSchema),
  handler: async (query) => {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        include: WITH_ROLE_INCLUDE,
        orderBy: { name: "asc" },
        ...ToSkipTake(query),
      }),
      prisma.user.count(),
    ]);
    return {
      data: users.map(ToUserDTO),
      pagination: BuildPaginationMeta(query, total),
    };
  },
});

export const POST = CreateApiRoute({
  moduleName: "users",
  schema: CreateUserInputSchema,
  requiresAuth: { status: true, permission: "user:manage" },
  responseSchema: CreateUserResponseSchema,
  handler: async (body) => {
    const temporaryPassword = GenerateTemporaryPassword();

    try {
      // Same auth.api.signUpEmail call shape as prisma/seed.ts's
      // ensureDevUser — better-auth owns password hashing, so this handler
      // never touches HashPassword itself.
      const result = await auth.api.signUpEmail({
        body: {
          email: body.email,
          password: temporaryPassword,
          name: body.name,
          username: body.username,
        },
      });

      const user = await prisma.user.update({
        where: { id: result.user.id },
        data: { roleId: body.roleId },
        include: WITH_ROLE_INCLUDE,
      });

      return { user: ToUserDTO(user), temporaryPassword };
    } catch (err) {
      if (err instanceof APIError) {
        return NextResponse.json(
          { error: err.body?.message ?? "Couldn't create user" },
          { status: err.statusCode },
        );
      }
      throw err;
    }
  },
});
