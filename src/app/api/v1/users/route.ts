import { APIError } from "better-auth";
import { NextResponse } from "next/server";
import {
  CreateUserInputSchema,
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
import { AssertCanGrantRole } from "@/lib/server/access-containment";

export const GET = CreateApiRoute({
  moduleName: "users",
  schema: PaginationQuerySchema,
  requiresAuth: { status: true, permission: "user:manage" },
  responseSchema: PaginatedResponseSchema(UserSchema),
  handler: async (query, session) => {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        include: WITH_ROLE_INCLUDE,
        orderBy: { name: "asc" },
        ...ToSkipTake(query),
      }),
      prisma.user.count(),
    ]);
    return {
      data: users.map((user) => ToUserDTO(user, session?.permissions ?? [])),
      pagination: BuildPaginationMeta(query, total),
    };
  },
});

export const POST = CreateApiRoute({
  moduleName: "users",
  schema: CreateUserInputSchema,
  requiresAuth: { status: true, permission: "user:manage" },
  responseSchema: UserSchema,
  activity: ({ result }) => ({
    type: "access",
    action: "user.create",
    message: `Created user ${result.name} (${result.username})`,
    entityType: "user",
    entityId: result.id,
    entityLabel: result.name,
    changes: { role: result.roleName },
  }),
  handler: async (body, session) => {
    // A new account can't be given more access than its creator holds.
    await AssertCanGrantRole(session?.permissions ?? [], body.roleId);
    try {
      // Same auth.api.signUpEmail call shape as prisma/seed.ts's
      // ensureDevUser — better-auth owns password hashing, so this handler
      // never touches hashing itself. The Manager types the password
      // directly now (see docs/DECISIONS.md) rather than it being
      // auto-generated.
      const result = await auth.api.signUpEmail({
        body: {
          email: body.email,
          password: body.password,
          name: body.name,
          username: body.username,
        },
      });

      const user = await prisma.user.update({
        where: { id: result.user.id },
        data: { roleId: body.roleId },
        include: WITH_ROLE_INCLUDE,
      });

      return ToUserDTO(user, session?.permissions ?? []);
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
