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

export interface NavItem {
  label: string;
  href: string;
  icon: Icon;
}

// Each epic appends its own pages here as they land — keep this list in
// sync with routes that actually exist.
export const MANAGER_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/manager/dashboard", icon: GaugeIcon },
  { label: "Analytics", href: "/manager/analytics", icon: ChartLineUpIcon },
  { label: "Categories", href: "/manager/categories", icon: TagIcon },
  { label: "Products", href: "/manager/products", icon: PackageIcon },
  { label: "Stock", href: "/manager/stock", icon: ArchiveIcon },
  { label: "Materials", href: "/manager/materials", icon: FlaskIcon },
  { label: "Sales", href: "/manager/sales", icon: ReceiptIcon },
  { label: "Customers", href: "/manager/customers", icon: UsersIcon },
  { label: "Loans", href: "/manager/loans", icon: HandCoinsIcon },
  { label: "Users", href: "/manager/users", icon: UserGearIcon },
  { label: "Roles", href: "/manager/roles", icon: ShieldCheckIcon },
  { label: "Settings", href: "/manager/settings", icon: GearSixIcon },
  { label: "Legend", href: "/legend", icon: BookOpenIcon },
];

export const INVENTORY_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/inventory/dashboard", icon: GaugeIcon },
  { label: "Stock", href: "/inventory/stock", icon: ArchiveIcon },
  { label: "Materials", href: "/inventory/materials", icon: FlaskIcon },
  { label: "Sales", href: "/inventory/sales", icon: ReceiptIcon },
  { label: "Customers", href: "/inventory/customers", icon: UsersIcon },
  { label: "Legend", href: "/legend", icon: BookOpenIcon },
];
