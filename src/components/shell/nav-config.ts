"use client";

import {
  ArchiveIcon,
  BookOpenIcon,
  ChartLineUpIcon,
  FlaskIcon,
  GaugeIcon,
  GearSixIcon,
  HandCoinsIcon,
  PackageIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  TagIcon,
  UserGearIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react/lib";
import { ROLES } from "@/lib/roles";

export interface NavItem {
  label: string;
  href: string;
  icon: Icon;
  // Shown only to users holding at least one of these permissions — the
  // same permission the page itself checks, so the nav never links to a
  // page that would bounce the user to /unauthorized.
  permission: string[];
}

// Each epic appends its own pages here as they land — keep this list in
// sync with routes that actually exist, and keep each item's `permission`
// in sync with the CheckPermission call in that route's page.tsx.
export const MANAGER_NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/manager/dashboard",
    icon: GaugeIcon,
    permission: ["analytics:read"],
  },
  {
    label: "Analytics",
    href: "/manager/analytics",
    icon: ChartLineUpIcon,
    permission: ["analytics:read"],
  },
  {
    label: "Categories",
    href: "/manager/categories",
    icon: TagIcon,
    permission: ["category:manage"],
  },
  {
    label: "Products",
    href: "/manager/products",
    icon: PackageIcon,
    permission: ["product:read"],
  },
  {
    label: "Stock",
    href: "/manager/stock",
    icon: ArchiveIcon,
    permission: ["stock:read"],
  },
  {
    label: "Materials",
    href: "/manager/materials",
    icon: FlaskIcon,
    permission: ["raw-material:read"],
  },
  {
    label: "Sales",
    href: "/manager/sales",
    icon: ReceiptIcon,
    permission: ["sale:read"],
  },
  {
    label: "Customers",
    href: "/manager/customers",
    icon: UsersIcon,
    permission: ["customer:manage"],
  },
  {
    label: "Loans",
    href: "/manager/loans",
    icon: HandCoinsIcon,
    permission: ["loan:manage"],
  },
  {
    label: "Users",
    href: "/manager/users",
    icon: UserGearIcon,
    permission: ["user:manage"],
  },
  {
    label: "Roles",
    href: "/manager/roles",
    icon: ShieldCheckIcon,
    permission: ["role:manage"],
  },
  {
    label: "Settings",
    href: "/manager/settings",
    icon: GearSixIcon,
    permission: ["unit-conversion:manage", "raw-material:manage"],
  },
  { label: "Legend", href: "/legend", icon: BookOpenIcon, permission: [] },
];

export const INVENTORY_NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/inventory/dashboard",
    icon: GaugeIcon,
    permission: ["stock:read"],
  },
  {
    label: "Stock",
    href: "/inventory/stock",
    icon: ArchiveIcon,
    permission: ["stock:read"],
  },
  {
    label: "Materials",
    href: "/inventory/materials",
    icon: FlaskIcon,
    permission: ["raw-material:read"],
  },
  {
    label: "Sales",
    href: "/inventory/sales",
    icon: ReceiptIcon,
    permission: ["sale:read"],
  },
  {
    label: "Customers",
    href: "/inventory/customers",
    icon: UsersIcon,
    permission: ["customer:read"],
  },
  { label: "Legend", href: "/legend", icon: BookOpenIcon, permission: [] },
];

function HasAny(permissions: string[], required: string[]) {
  return required.length === 0 || required.some((p) => permissions.includes(p));
}

// Navigation follows permissions, not role names (Epic 21): a role's own
// area (Manager → /manager, everyone else → /inventory) comes first,
// filtered to what the user may open; then any page from the Manager
// area the user has been granted on the Roles page is appended (e.g.
// "View analytics" given to Inventory Manager adds Analytics), skipping
// labels the base list already covers. Before Epic 21, area access was
// decided by role name, so most toggles on the Roles page had no visible
// effect. See docs/DECISIONS.md, "Epic 21 decisions".
export function BuildNavItems(
  role: string | null | undefined,
  permissions: string[],
): NavItem[] {
  const isManager = role === ROLES.MANAGER;
  const base = (isManager ? MANAGER_NAV_ITEMS : INVENTORY_NAV_ITEMS).filter(
    (item) => HasAny(permissions, item.permission),
  );
  if (isManager) return base;

  const labels = new Set(base.map((item) => item.label));
  const extras = MANAGER_NAV_ITEMS.filter(
    (item) =>
      item.permission.length > 0 &&
      !labels.has(item.label) &&
      HasAny(permissions, item.permission),
  );
  // Keep Legend last.
  const legend = base.filter((item) => item.href === "/legend");
  return [
    ...base.filter((item) => item.href !== "/legend"),
    ...extras,
    ...legend,
  ];
}
