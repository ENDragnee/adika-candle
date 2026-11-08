import {
  RolesResponseSchema,
  ToModuleDTO,
  ToRoleDTO,
} from "@/features/roles/validators/role.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

export const GET = CreateApiRoute({
  moduleName: "roles",
  requiresAuth: { status: true, permission: "role:manage" },
  responseSchema: RolesResponseSchema,
  handler: async () => {
    const [roles, modules] = await Promise.all([
      prisma.role.findMany({
        include: { permissions: { select: { id: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.module.findMany({
        include: { permissions: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      roles: roles.map(ToRoleDTO),
      modules: modules.map(ToModuleDTO),
    };
  },
});
