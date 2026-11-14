import { NextResponse } from "next/server";
import {
  ROLE_DTO_INCLUDE,
  type RoleDTO,
  RoleSchema,
  ToRoleDTO,
  type UpdateRoleInput,
  UpdateRoleInputSchema,
} from "@/features/roles/validators/role.schema";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";
import { AssertCanEditRole } from "@/lib/server/access-containment";
import { DomainError } from "@/lib/server/domain-error";

type Params = { id: string };

async function FindRole(
  id: string | undefined,
  viewerPermissions: readonly string[],
) {
  const role = id
    ? await prisma.role.findUnique({
        where: { id },
        include: ROLE_DTO_INCLUDE,
      })
    : null;
  if (!role) throw new DomainError("Role not found", 404, "NOT_FOUND");
  return ToRoleDTO(role, viewerPermissions);
}

// Rename / re-describe a role. The two built-in roles keep their names:
// code refers to them by name (e.g. which sidebar area a Manager sees).
export const PATCH = CreateApiRoute<UpdateRoleInput, Params, RoleDTO>({
  moduleName: "roles",
  schema: UpdateRoleInputSchema,
  requiresAuth: { status: true, permission: "role:manage" },
  responseSchema: RoleSchema,
  activity: ({ result, body }) => ({
    type: "access",
    action: "role.update",
    message: `Edited role ${result.name}`,
    entityType: "role",
    entityId: result.id,
    entityLabel: result.name,
    changes: { ...body },
  }),
  handler: async (body, session, params) => {
    const existing = await FindRole(params?.id, session?.permissions ?? []);
    await AssertCanEditRole(session?.permissions ?? [], existing.id);
    if (existing.isBuiltIn && body.name && body.name !== existing.name) {
      throw new DomainError(
        "Built-in roles can't be renamed",
        400,
        "BUILT_IN_ROLE",
      );
    }
    try {
      const role = await prisma.role.update({
        where: { id: existing.id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.description !== undefined && {
            description: body.description || null,
          }),
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

// Delete a custom role — only once nobody holds it, so no account is ever
// left without a role by accident.
export const DELETE = CreateApiRoute<unknown, Params, RoleDTO>({
  moduleName: "roles",
  requiresAuth: { status: true, permission: "role:manage" },
  responseSchema: RoleSchema,
  activity: ({ result }) => ({
    type: "access",
    action: "role.delete",
    message: `Deleted role ${result.name}`,
    severity: "WARN",
    entityType: "role",
    entityId: result.id,
    entityLabel: result.name,
  }),
  handler: async (_body, session, params) => {
    const role = await FindRole(params?.id, session?.permissions ?? []);
    await AssertCanEditRole(session?.permissions ?? [], role.id);
    if (role.isBuiltIn) {
      throw new DomainError(
        "Built-in roles can't be deleted",
        400,
        "BUILT_IN_ROLE",
      );
    }
    if (role.userCount > 0) {
      throw new DomainError(
        `${role.userCount === 1 ? "1 person has" : `${role.userCount} people have`} this role. Give them another role first.`,
        409,
        "ROLE_IN_USE",
      );
    }
    await prisma.role.delete({ where: { id: role.id } });
    return role;
  },
});
