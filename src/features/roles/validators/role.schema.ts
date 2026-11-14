import { z } from "zod";
import type { Module, Permission, Role } from "@/generated/prisma/client";
import { IsWithinReach } from "@/lib/access-rules";
import { ROLES } from "@/lib/roles";

export const PermissionSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type PermissionDTO = z.infer<typeof PermissionSchema>;

export const ModuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  permissions: z.array(PermissionSchema),
});

export type ModuleDTO = z.infer<typeof ModuleSchema>;

export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  permissionIds: z.array(z.string()),
  // Admin / Manager / Inventory Manager — referenced by name in code, so
  // they can't be renamed or deleted (Epic 22).
  isBuiltIn: z.boolean(),
  // Whether the viewer may edit this role: false when it holds access the
  // viewer's own role doesn't (Epic 23). The API enforces it either way.
  canEdit: z.boolean(),
  userCount: z.number().int(),
});

export type RoleDTO = z.infer<typeof RoleSchema>;

// GET /api/v1/roles returns both the roles and the full Module/Permission
// catalog in one call (rather than a bare array of roles) — the
// /manager/roles UI groups checkboxes by Module (mirroring
// prisma/seed.ts's MODULE_PERMISSIONS shape) and needs the complete
// catalog to render unassigned permissions too, not just the ones a role
// already has. See docs/DECISIONS.md, "Epic 7 decisions".
export const RolesResponseSchema = z.object({
  roles: z.array(RoleSchema),
  modules: z.array(ModuleSchema),
});

export type RolesResponse = z.infer<typeof RolesResponseSchema>;

export const UpdateRolePermissionsInputSchema = z.object({
  permissionIds: z.array(z.string()),
});

export type UpdateRolePermissionsInput = z.infer<
  typeof UpdateRolePermissionsInputSchema
>;

type RoleWithPermissions = Role & {
  permissions: Pick<Permission, "id" | "name">[];
  _count?: { users: number };
};

export const BUILT_IN_ROLE_NAMES: readonly string[] = Object.values(ROLES);

export function ToRoleDTO(
  role: RoleWithPermissions,
  viewerPermissions: readonly string[],
): RoleDTO {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissionIds: role.permissions.map((permission) => permission.id),
    isBuiltIn: BUILT_IN_ROLE_NAMES.includes(role.name),
    canEdit: IsWithinReach(
      viewerPermissions,
      role.permissions.map((permission) => permission.name),
    ),
    userCount: role._count?.users ?? 0,
  };
}

// Everything a role query needs for ToRoleDTO.
export const ROLE_DTO_INCLUDE = {
  permissions: { select: { id: true, name: true } },
  _count: { select: { users: true } },
} as const;

const RoleNameSchema = z
  .string()
  .trim()
  .min(2, "Give the role a name of at least 2 characters")
  .max(60, "Keep the name under 60 characters");

export const CreateRoleInputSchema = z.object({
  name: RoleNameSchema,
  description: z.string().trim().max(200).optional(),
  // Start from an existing role's permissions instead of none.
  copyFromRoleId: z.string().min(1).optional(),
});
export type CreateRoleInput = z.infer<typeof CreateRoleInputSchema>;

export const UpdateRoleInputSchema = z.object({
  name: RoleNameSchema.optional(),
  description: z.string().trim().max(200).nullable().optional(),
});
export type UpdateRoleInput = z.infer<typeof UpdateRoleInputSchema>;

type ModuleWithPermissions = Module & { permissions: Permission[] };

export function ToModuleDTO(module: ModuleWithPermissions): ModuleDTO {
  return {
    id: module.id,
    name: module.name,
    permissions: module.permissions.map((permission) => ({
      id: permission.id,
      name: permission.name,
    })),
  };
}
