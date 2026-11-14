import { prisma } from "@/lib/prisma";

// The permission that keeps someone working through maintenance mode
// (Epic 24) — the same one that turns it on and off.
export const MAINTENANCE_EXEMPT_PERMISSION = "system:manage";

export function IsMaintenanceExempt(permissions: readonly string[]): boolean {
  return permissions.includes(MAINTENANCE_EXEMPT_PERMISSION);
}

// Ends every session whose user would be shut out by maintenance mode, so
// nobody keeps a half-working page open. Exempt users keep theirs.
export async function EndSessionsBlockedByMaintenance(): Promise<number> {
  const { count } = await prisma.session.deleteMany({
    where: {
      user: {
        OR: [
          { roleId: null },
          {
            role: {
              permissions: {
                none: { name: MAINTENANCE_EXEMPT_PERMISSION },
              },
            },
          },
        ],
      },
    },
  });
  return count;
}
