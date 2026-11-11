import { NextResponse } from "next/server";
import type {
  RoleDTO,
  UpdateRolePermissionsInput,
} from "@/features/roles/validators/role.schema";
import {
  RoleSchema,
  ToRoleDTO,
  UpdateRolePermissionsInputSchema,
} from "@/features/roles/validators/role.schema";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

// Permissions that must always stay assigned to at least one role, so
// there's never a moment where no role can manage users/roles at all. Per
// the epic doc's own route description ("edit permission assignments per
// role"), this handler only ever touches the permission list — it never
// renames a role, even though Role.name is technically editable in the
// schema. See docs/DECISIONS.md, "Epic 7 decisions".
const GUARDED_PERMISSION_NAMES = ["role:manage", "user:manage"];

export const PATCH = CreateApiRoute<
  UpdateRolePermissionsInput,
  Params,
  RoleDTO
>({
  moduleName: "roles",
  schema: UpdateRolePermissionsInputSchema,
  requiresAuth: { status: true, permission: "role:manage" },
  responseSchema: RoleSchema,
  handler: async (body, session, params) => {
    // Self-lockout guard (Epic 21): taking "role:manage" off your *own*
    // role would lock you out of this page with no way to undo it. The
    // check below only ensures *some* role keeps the permission.
    const role = await prisma.role.findUnique({ where: { id: params?.id } });
    if (role && role.name === session?.role) {
      const roleManage = await prisma.permission.findUnique({
        where: { name: "role:manage" },
      });
      if (roleManage && !body.permissionIds.includes(roleManage.id)) {
        return NextResponse.json(
          {
            error:
              "You can't remove \"Manage roles\" from your own role — you'd be locked out of this page",
          },
          { status: 400 },
        );
      }
    }

    const guardedPermissions = await prisma.permission.findMany({
      where: { name: { in: GUARDED_PERMISSION_NAMES } },
    });

    for (const permission of guardedPermissions) {
      if (body.permissionIds.includes(permission.id)) {
        continue;
      }

      const otherHolderCount = await prisma.role.count({
        where: {
          id: { not: params?.id },
          permissions: { some: { id: permission.id } },
        },
      });

      if (otherHolderCount === 0) {
        return NextResponse.json(
          {
            error: `Removing "${permission.name}" here would leave no role with this permission — assign it to another role first`,
          },
          { status: 400 },
        );
      }
    }

    try {
      const role = await prisma.role.update({
        where: { id: params?.id },
        data: {
          permissions: { set: body.permissionIds.map((id) => ({ id })) },
        },
        include: { permissions: { select: { id: true } } },
      });
      return ToRoleDTO(role);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return NextResponse.json(
          { error: "Role or permission not found" },
          { status: 404 },
        );
      }
      throw err;
    }
  },
});
