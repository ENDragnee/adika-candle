export interface NavItem {
  label: string;
  href: string;
}

// Each epic appends its own pages here as they land — keep this list in
// sync with routes that actually exist.
export const MANAGER_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/manager/dashboard" },
  { label: "Categories", href: "/manager/categories" },
  { label: "Products", href: "/manager/products" },
  { label: "Settings", href: "/manager/settings" },
];

export const INVENTORY_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/inventory/dashboard" },
];
