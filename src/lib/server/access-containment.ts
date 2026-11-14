import { IsWithinReach, MissingPermissions } from "@/lib/access-rules";
import { prisma } from "@/lib/prisma";
import { DomainError } from "./domain-error";

// Access containment: nobody can hand out, or act on, access they don't
// hold themselves. Without it the Manager (user:manage + role:manage)
// could assign themselves the Admin role, add session:manage to their own
// role, or reset the Admin's password and sign in as them. Admin holds
// every permission, so for Admin these checks always pass.
//
// "Outranks" is a permission-set comparison, not a role-name one, so it
// stays correct for custom roles: a role is within reach when every one
// of its permissions is one the actor holds.

async function RolePermissionNames(roleId: string): Promise<string[] | null> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { permissions: { select: { name: true } } },
  });
  return role ? role.permissions.map((permission) => permission.name) : null;
}

function Forbidden(message: string): DomainError {
  return new DomainError(message, 403, "OUTSIDE_YOUR_ACCESS");
}

// Assigning a role, or creating one as a copy of it.
export async function AssertCanGrantRole(
  actorPermissions: readonly string[],
  roleId: string,
): Promise<void> {
  const names = await RolePermissionNames(roleId);
  if (!names) throw new DomainError("Role not found", 400, "NOT_FOUND");
  if (!IsWithinReach(actorPermissions, names)) {
    throw Forbidden(
      "That role can do things your own role can't, so you can't give it out",
    );
  }
}

// Editing, renaming or deleting a role.
export async function AssertCanEditRole(
  actorPermissions: readonly string[],
  roleId: string,
): Promise<void> {
  const names = await RolePermissionNames(roleId);
  if (!names) throw new DomainError("Role not found", 404, "NOT_FOUND");
  if (!IsWithinReach(actorPermissions, names)) {
    throw Forbidden(
      "This role can do things your own role can't, so you can't change it",
    );
  }
}

// Setting a role's permission list: only permissions the actor holds can
// be added or taken away.
export async function AssertCanSetPermissions(
  actorPermissions: readonly string[],
  roleId: string,
  nextPermissionIds: readonly string[],
): Promise<void> {
  await AssertCanEditRole(actorPermissions, roleId);
  const next = await prisma.permission.findMany({
    where: { id: { in: [...nextPermissionIds] } },
    select: { name: true },
  });
  const missing = MissingPermissions(
    actorPermissions,
    next.map((permission) => permission.name),
  );
  if (missing.length > 0) {
    throw Forbidden(
      `You can't give a role access you don't have yourself (${missing.join(", ")})`,
    );
  }
}

// Renaming, re-roling, deactivating, resetting the password of, or
// signing out another account.
export async function AssertCanManageUser(
  actorPermissions: readonly string[],
  userId: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: { select: { permissions: { select: { name: true } } } } },
  });
  if (!user) throw new DomainError("User not found", 404, "NOT_FOUND");
  const names = user.role?.permissions.map((permission) => permission.name);
  if (names && !IsWithinReach(actorPermissions, names)) {
    throw Forbidden(
      "This person has access your own role doesn't, so you can't change their account",
    );
  }
}
