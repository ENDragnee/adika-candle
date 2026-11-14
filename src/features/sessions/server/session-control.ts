import type { Prisma } from "@/generated/prisma/client";
import { IsWithinReach } from "@/lib/access-rules";
import { prisma } from "@/lib/prisma";

// Sessions are rows in better-auth's `session` table and every request
// re-reads them (no cookie cache is configured in src/lib/auth.ts), so
// deleting a row signs that device out on its very next request.

export function ActiveSessionWhere(): Prisma.SessionWhereInput {
  return { expiresAt: { gt: new Date() } };
}

// Roles holding access the actor doesn't — their users' sessions are out
// of the actor's reach (access containment, Epic 23).
export async function OutOfReachRoleIds(
  actorPermissions: readonly string[],
): Promise<string[]> {
  const roles = await prisma.role.findMany({
    select: { id: true, permissions: { select: { name: true } } },
  });
  return roles
    .filter(
      (role) =>
        !IsWithinReach(
          actorPermissions,
          role.permissions.map((permission) => permission.name),
        ),
    )
    .map((role) => role.id);
}

// Users with no role are always within reach; the `OR` keeps them in.
export function WithinReachUserWhere(
  outOfReachRoleIds: string[],
): Prisma.UserWhereInput {
  if (outOfReachRoleIds.length === 0) return {};
  return {
    OR: [{ roleId: null }, { roleId: { notIn: outOfReachRoleIds } }],
  };
}
