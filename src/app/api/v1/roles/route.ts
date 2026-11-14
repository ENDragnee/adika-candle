import { NextResponse } from "next/server";
import {
  CreateRoleInputSchema,
  ROLE_DTO_INCLUDE,
  RoleSchema,
  RolesResponseSchema,
  ToModuleDTO,
  ToRoleDTO,
} from "@/features/roles/validators/role.schema";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";
import { AssertCanGrantRole } from "@/lib/server/access-containment";

export const GET = CreateApiRoute({
  moduleName: "roles",
  requiresAuth: { status: true, permission: "role:manage" },
  responseSchema: RolesResponseSchema,
  handler: async (_query, session) => {
    const [roles, modules] = await Promise.all([
      prisma.role.findMany({
        include: ROLE_DTO_INCLUDE,
        orderBy: { name: "asc" },
      }),
      prisma.module.findMany({
        include: { permissions: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      roles: roles.map((role) => ToRoleDTO(role, session?.permissions ?? [])),
      modules: modules.map(ToModuleDTO),
    };
  },
});

// Custom roles (Epic 22). A new role starts with no permissions, or a copy
// of another role's; users holding it land on the first page their
// permissions open (HomeRouteFor), so no code needs to know its name.
export const POST = CreateApiRoute({
  moduleName: "roles",
  schema: CreateRoleInputSchema,
  requiresAuth: { status: true, permission: "role:manage" },
  responseSchema: RoleSchema,
  activity: ({ result, body }) => ({
    type: "access",
    action: "role.create",
    message: `Created role ${result.name}`,
    severity: "WARN",
    entityType: "role",
    entityId: result.id,
    entityLabel: result.name,
    changes: {
      permissionCount: result.permissionIds.length,
      copiedFrom: body.copyFromRoleId ?? null,
    },
  }),
  handler: async (body, session) => {
    // A copy can't carry access its creator doesn't hold (Epic 23).
    if (body.copyFromRoleId) {
      await AssertCanGrantRole(session?.permissions ?? [], body.copyFromRoleId);
    }
    const source = body.copyFromRoleId
      ? await prisma.role.findUnique({
          where: { id: body.copyFromRoleId },
          include: { permissions: { select: { id: true } } },
        })
      : null;
    if (body.copyFromRoleId && !source) {
      return NextResponse.json(
        { error: "The role to copy from no longer exists" },
        { status: 404 },
      );
    }

    try {
      const role = await prisma.role.create({
        data: {
          name: body.name,
          description: body.description || null,
          permissions: source
            ? { connect: source.permissions.map(({ id }) => ({ id })) }
            : undefined,
        },
        include: ROLE_DTO_INCLUDE,
      });
      return ToRoleDTO(role, session?.permissions ?? []);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "A role with that name already exists", code: "DUPLICATE" },
          { status: 409 },
        );
      }
      throw err;
    }
  },
});
