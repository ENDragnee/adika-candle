import { MANAGER_AREA_ROLES } from "./roles";

// Which pages exist and which permission opens each (Epic 21/22). Plain
// data with no icons, so server code (the post-sign-in redirect) and client
// code (the sidebar, which adds icons in nav-config.ts) share one list.
// Keep each `permission` in sync with the CheckPermission call in that
// route's page.tsx.
// Sidebar groups (Epic 25), ordered from everyday work to admin-only.
// Each group gathers pages that need about the same level of access, so
// a role simply sees fewer groups: Inventory Manager gets Daily work;
// Manager adds Insights, Catalog and People & access; Admin adds System.
// "home" (Dashboard) and "help" (Legend) render without a heading.
export const NAV_GROUPS = [
  { id: "home", label: null },
  { id: "operations", label: "Daily work" },
  { id: "insights", label: "Insights" },
  { id: "catalog", label: "Catalog" },
  { id: "people", label: "People & access" },
  { id: "system", label: "System" },
  { id: "help", label: null },
] as const;

export type NavGroupId = (typeof NAV_GROUPS)[number]["id"];

export interface NavRoute {
  label: string;
  href: string;
  // Shown to users holding at least one of these; [] = everyone.
  permission: string[];
  group: NavGroupId;
}

export const MANAGER_ROUTES: NavRoute[] = [
  {
    label: "Dashboard",
    href: "/manager/dashboard",
    permission: ["analytics:read"],
    group: "home",
  },
  {
    label: "Sales",
    href: "/manager/sales",
    permission: ["sale:read"],
    group: "operations",
  },
  {
    label: "Stock",
    href: "/manager/stock",
    permission: ["stock:read"],
    group: "operations",
  },
  {
    label: "Materials",
    href: "/manager/materials",
    permission: ["raw-material:read"],
    group: "operations",
  },
  {
    label: "Customers",
    href: "/manager/customers",
    permission: ["customer:manage"],
    group: "operations",
  },
  {
    label: "Loans",
    href: "/manager/loans",
    permission: ["loan:manage"],
    group: "operations",
  },
  {
    label: "Analytics",
    href: "/manager/analytics",
    permission: ["analytics:read"],
    group: "insights",
  },
  {
    label: "Activities",
    href: "/manager/activities",
    permission: ["activity:read"],
    group: "insights",
  },
  {
    label: "Products",
    href: "/manager/products",
    permission: ["product:read"],
    group: "catalog",
  },
  {
    label: "Categories",
    href: "/manager/categories",
    permission: ["category:manage"],
    group: "catalog",
  },
  {
    label: "Settings",
    href: "/manager/settings",
    permission: ["unit-conversion:manage", "raw-material:manage"],
    group: "catalog",
  },
  {
    label: "Users",
    href: "/manager/users",
    permission: ["user:manage"],
    group: "people",
  },
  {
    label: "Roles",
    href: "/manager/roles",
    permission: ["role:manage"],
    group: "people",
  },
  {
    label: "Sessions",
    href: "/manager/sessions",
    permission: ["session:manage"],
    group: "system",
  },
  {
    label: "System",
    href: "/manager/system",
    permission: ["system:manage"],
    group: "system",
  },
  { label: "Legend", href: "/legend", permission: [], group: "help" },
];

export const INVENTORY_ROUTES: NavRoute[] = [
  {
    label: "Dashboard",
    href: "/inventory/dashboard",
    permission: ["stock:read"],
    group: "home",
  },
  {
    label: "Sales",
    href: "/inventory/sales",
    permission: ["sale:read"],
    group: "operations",
  },
  {
    label: "Stock",
    href: "/inventory/stock",
    permission: ["stock:read"],
    group: "operations",
  },
  {
    label: "Materials",
    href: "/inventory/materials",
    permission: ["raw-material:read"],
    group: "operations",
  },
  {
    label: "Customers",
    href: "/inventory/customers",
    permission: ["customer:read"],
    group: "operations",
  },
  { label: "Legend", href: "/legend", permission: [], group: "help" },
];

const GROUP_ORDER = new Map(
  NAV_GROUPS.map((group, index) => [group.id, index]),
);

function ByGroup(routes: NavRoute[]): NavRoute[] {
  // Array.prototype.sort is stable: routes keep their order within a group.
  return [...routes].sort(
    (a, b) => (GROUP_ORDER.get(a.group) ?? 0) - (GROUP_ORDER.get(b.group) ?? 0),
  );
}

export interface NavGroup<T extends NavRoute = NavRoute> {
  id: NavGroupId;
  label: string | null;
  items: T[];
}

// The sidebar's sections: only groups with at least one visible page.
export function GroupNavRoutes<T extends NavRoute>(routes: T[]): NavGroup<T>[] {
  return NAV_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    items: routes.filter((route) => route.group === group.id),
  })).filter((group) => group.items.length > 0);
}

function HasAny(permissions: string[], required: string[]) {
  return required.length === 0 || required.some((p) => permissions.includes(p));
}

// Navigation follows permissions, not role names: the role's own area
// (Admin/Manager → /manager, every other role → /inventory) filtered to what the
// user may open, then any Manager-area page the role was granted on the
// Roles page, skipping labels already covered — all in sidebar-group
// order (NAV_GROUPS), so Legend stays last.
export function BuildNavRoutes(
  role: string | null | undefined,
  permissions: string[],
): NavRoute[] {
  const isManager = !!role && MANAGER_AREA_ROLES.includes(role);
  const base = (isManager ? MANAGER_ROUTES : INVENTORY_ROUTES).filter((route) =>
    HasAny(permissions, route.permission),
  );
  if (isManager) return ByGroup(base);

  const labels = new Set(base.map((route) => route.label));
  const extras = MANAGER_ROUTES.filter(
    (route) =>
      route.permission.length > 0 &&
      !labels.has(route.label) &&
      HasAny(permissions, route.permission),
  );
  return ByGroup([...base, ...extras]);
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
