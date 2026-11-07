export interface NavItem {
  label: string;
  href: string;
}

// Each epic appends its own pages here as they land — keep this list in
// sync with routes that actually exist. Epic 1 only ships the dashboards,
// so that's all that's listed below.
export const MANAGER_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/manager/dashboard" },
];

export const INVENTORY_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/inventory/dashboard" },
];
