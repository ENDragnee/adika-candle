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
  { label: "Stock", href: "/manager/stock" },
  { label: "Sales", href: "/manager/sales" },
  { label: "Customers", href: "/manager/customers" },
  { label: "Loans", href: "/manager/loans" },
  { label: "Users", href: "/manager/users" },
  { label: "Roles", href: "/manager/roles" },
  { label: "Settings", href: "/manager/settings" },
];

export const INVENTORY_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/inventory/dashboard" },
  { label: "Stock", href: "/inventory/stock" },
  { label: "Accept Stock", href: "/inventory/stock/accept" },
  { label: "Sales", href: "/inventory/sales" },
  { label: "Record Sale", href: "/inventory/sales/new" },
  { label: "Customers", href: "/inventory/customers" },
];
