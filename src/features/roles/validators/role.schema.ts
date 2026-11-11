import { z } from "zod";
import type { Module, Permission, Role } from "@/generated/prisma/client";

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

type RoleWithPermissions = Role & { permissions: Pick<Permission, "id">[] };

export function ToRoleDTO(role: RoleWithPermissions): RoleDTO {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissionIds: role.permissions.map((permission) => permission.id),
  };
}

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
