"use client";

import {
  ArchiveIcon,
  BookOpenIcon,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
  DevicesIcon,
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
import {
  BuildNavRoutes,
  INVENTORY_ROUTES,
  MANAGER_ROUTES,
  type NavRoute,
} from "@/lib/nav-routes";

export interface NavItem extends NavRoute {
  icon: Icon;
}

// Icons per route; the routes themselves (and which permission opens
// each) live in src/lib/nav-routes.ts so server code can use them too.
const ICONS: Record<string, Icon> = {
  "/manager/dashboard": GaugeIcon,
  "/manager/analytics": ChartLineUpIcon,
  "/manager/activities": ClockCounterClockwiseIcon,
  "/manager/categories": TagIcon,
  "/manager/products": PackageIcon,
  "/manager/stock": ArchiveIcon,
  "/manager/materials": FlaskIcon,
  "/manager/sales": ReceiptIcon,
  "/manager/customers": UsersIcon,
  "/manager/loans": HandCoinsIcon,
  "/manager/users": UserGearIcon,
  "/manager/roles": ShieldCheckIcon,
  "/manager/sessions": DevicesIcon,
  "/manager/settings": GearSixIcon,
  "/legend": BookOpenIcon,
  "/inventory/dashboard": GaugeIcon,
  "/inventory/stock": ArchiveIcon,
  "/inventory/materials": FlaskIcon,
  "/inventory/sales": ReceiptIcon,
  "/inventory/customers": UsersIcon,
};

function WithIcon(route: NavRoute): NavItem {
  return { ...route, icon: ICONS[route.href] ?? BookOpenIcon };
}

export const MANAGER_NAV_ITEMS: NavItem[] = MANAGER_ROUTES.map(WithIcon);
export const INVENTORY_NAV_ITEMS: NavItem[] = INVENTORY_ROUTES.map(WithIcon);

export function BuildNavItems(
  role: string | null | undefined,
  permissions: string[],
): NavItem[] {
  return BuildNavRoutes(role, permissions).map(WithIcon);
}
