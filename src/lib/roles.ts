// Split out of redirector.ts so client components can import just the role
// constants without dragging in GetSession's "next/headers" dependency —
// redirector.ts (server-only) re-exports this for its existing importers.
export const ROLES = {
  // Everything the Manager can do, plus session control (session:manage).
  // Epic 23.
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  INVENTORY_MANAGER: "INVENTORY_MANAGER",
} as const;

// Roles whose home is the /manager area (the full sidebar); every other
// role starts from /inventory. See BuildNavRoutes.
export const MANAGER_AREA_ROLES: readonly string[] = [
  ROLES.ADMIN,
  ROLES.MANAGER,
];

// "INVENTORY_MANAGER" → "Inventory Manager". Lives here (not in the roles
// feature) because the app shell shows it too.
export function HumanizeRoleName(roleName: string): string {
  return roleName
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
