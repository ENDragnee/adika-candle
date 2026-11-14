import { MANAGER_AREA_ROLES } from "./roles";

// Which pages exist and which permission opens each (Epic 21/22). Plain
// data with no icons, so server code (the post-sign-in redirect) and client
// code (the sidebar, which adds icons in nav-config.ts) share one list.
// Keep each `permission` in sync with the CheckPermission call in that
// route's page.tsx.
export interface NavRoute {
  label: string;
  href: string;
  // Shown to users holding at least one of these; [] = everyone.
  permission: string[];
}

export const MANAGER_ROUTES: NavRoute[] = [
  {
    label: "Dashboard",
    href: "/manager/dashboard",
    permission: ["analytics:read"],
  },
  {
    label: "Analytics",
    href: "/manager/analytics",
    permission: ["analytics:read"],
  },
  {
    label: "Activities",
    href: "/manager/activities",
    permission: ["activity:read"],
  },
  {
    label: "Categories",
    href: "/manager/categories",
    permission: ["category:manage"],
  },
  {
    label: "Products",
    href: "/manager/products",
    permission: ["product:read"],
  },
  { label: "Stock", href: "/manager/stock", permission: ["stock:read"] },
  {
    label: "Materials",
    href: "/manager/materials",
    permission: ["raw-material:read"],
  },
  { label: "Sales", href: "/manager/sales", permission: ["sale:read"] },
  {
    label: "Customers",
    href: "/manager/customers",
    permission: ["customer:manage"],
  },
  { label: "Loans", href: "/manager/loans", permission: ["loan:manage"] },
  { label: "Users", href: "/manager/users", permission: ["user:manage"] },
  { label: "Roles", href: "/manager/roles", permission: ["role:manage"] },
  {
    label: "Sessions",
    href: "/manager/sessions",
    permission: ["session:manage"],
  },
  {
    label: "System",
    href: "/manager/system",
    permission: ["system:manage"],
  },
  {
    label: "Settings",
    href: "/manager/settings",
    permission: ["unit-conversion:manage", "raw-material:manage"],
  },
  { label: "Legend", href: "/legend", permission: [] },
];

export const INVENTORY_ROUTES: NavRoute[] = [
  {
    label: "Dashboard",
    href: "/inventory/dashboard",
    permission: ["stock:read"],
  },
  { label: "Stock", href: "/inventory/stock", permission: ["stock:read"] },
  {
    label: "Materials",
    href: "/inventory/materials",
    permission: ["raw-material:read"],
  },
  { label: "Sales", href: "/inventory/sales", permission: ["sale:read"] },
  {
    label: "Customers",
    href: "/inventory/customers",
    permission: ["customer:read"],
  },
  { label: "Legend", href: "/legend", permission: [] },
];

function HasAny(permissions: string[], required: string[]) {
  return required.length === 0 || required.some((p) => permissions.includes(p));
}

// Navigation follows permissions, not role names: the role's own area
// (Admin/Manager → /manager, every other role → /inventory) filtered to what the
// user may open, then any Manager-area page the role was granted on the
// Roles page, skipping labels already covered. Legend stays last.
export function BuildNavRoutes(
  role: string | null | undefined,
  permissions: string[],
): NavRoute[] {
  const isManager = !!role && MANAGER_AREA_ROLES.includes(role);
  const base = (isManager ? MANAGER_ROUTES : INVENTORY_ROUTES).filter((route) =>
    HasAny(permissions, route.permission),
  );
  if (isManager) return base;

  const labels = new Set(base.map((route) => route.label));
  const extras = MANAGER_ROUTES.filter(
    (route) =>
      route.permission.length > 0 &&
      !labels.has(route.label) &&
      HasAny(permissions, route.permission),
  );
  const legend = base.filter((route) => route.href === "/legend");
  return [
    ...base.filter((route) => route.href !== "/legend"),
    ...extras,
    ...legend,
  ];
}

// Where a user lands after signing in (Epic 22): the first page their
// permissions open, so a custom role works without code knowing its
// name. null = no page at all (no role, or a role with no permissions).
export function HomeRouteFor(
  role: string | null | undefined,
  permissions: string[],
): string | null {
  if (!role) return null;
  return (
    BuildNavRoutes(role, permissions).find((route) => route.href !== "/legend")
      ?.href ?? null
  );
}

// Only same-site paths are ever followed after sign-in — never an
// absolute or protocol-relative URL from the query string.
export function SafeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (next.startsWith("/auth")) return null;
  return next;
}
