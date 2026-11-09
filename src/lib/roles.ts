// Split out of redirector.ts so client components can import just the role
// constants without dragging in GetSession's "next/headers" dependency —
// redirector.ts (server-only) re-exports this for its existing importers.
export const ROLES = {
  MANAGER: "MANAGER",
  INVENTORY_MANAGER: "INVENTORY_MANAGER",
} as const;
