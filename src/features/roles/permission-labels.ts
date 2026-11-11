import {
  ArchiveIcon,
  ChartLineUpIcon,
  FlaskIcon,
  GearSixIcon,
  HandCoinsIcon,
  type Icon,
  PackageIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  TagIcon,
  UserGearIcon,
  UsersIcon,
} from "@phosphor-icons/react";

// Translates the raw `module`/`permission` names this app's RBAC is built
// on (e.g. "raw-material:record") into the plain-language label + one-line
// description a non-technical Manager actually reads on /manager/roles —
// those identifiers are a fine key for the database and the API, but
// meaningless shown verbatim to someone who isn't the person who wrote
// this code. A missing entry falls back to the raw name (see
// `DescribePermission`/`DescribeModule` below) rather than throwing, so a
// newly seeded permission/module never breaks this page — it just shows
// unprettified until someone adds a line here.
export interface ModuleLabel {
  label: string;
  icon: Icon;
}

export const MODULE_LABELS: Record<string, ModuleLabel> = {
  analytics: { label: "Analytics", icon: ChartLineUpIcon },
  product: { label: "Products", icon: PackageIcon },
  category: { label: "Categories", icon: TagIcon },
  stock: { label: "Stock", icon: ArchiveIcon },
  customer: { label: "Customers", icon: UsersIcon },
  loan: { label: "Loans", icon: HandCoinsIcon },
  sale: { label: "Sales", icon: ReceiptIcon },
  user: { label: "Users", icon: UserGearIcon },
  role: { label: "Roles", icon: ShieldCheckIcon },
  "unit-conversion": { label: "Unit settings", icon: GearSixIcon },
  "raw-material": { label: "Raw materials", icon: FlaskIcon },
};

export interface PermissionLabel {
  label: string;
  description: string;
}

export const PERMISSION_LABELS: Record<string, PermissionLabel> = {
  "analytics:read": {
    label: "View analytics",
    description:
      "See production, profitability, stock health, and best-seller reports.",
  },
  "stock:adjust": {
    label: "Correct stock counts",
    description:
      "Record a physical stock count that corrects a product's or raw material's balance.",
  },
  "sale:void": {
    label: "Void sales",
    description:
      "Cancel a mistaken sale. Its stock and any customer balance change are reversed; the record is kept.",
  },
  "product:read": {
    label: "View products",
    description: "See the product catalog, prices, and costs.",
  },
  "product:manage": {
    label: "Manage products",
    description: "Add and edit products, and set new prices.",
  },
  "category:manage": {
    label: "Manage categories",
    description: "Add, edit, and organize product categories.",
  },
  "stock:read": {
    label: "View stock",
    description: "See current stock balances and the accept/sell history.",
  },
  "stock:accept": {
    label: "Accept stock",
    description: "Record newly received stock.",
  },
  "customer:read": {
    label: "View customers",
    description: "See the customer list and their loan balances.",
  },
  "customer:manage": {
    label: "Manage customers",
    description: "Add and edit customer details.",
  },
  "loan:record": {
    label: "Record loan repayments",
    description: "Record a customer paying down their loan balance.",
  },
  "loan:manage": {
    label: "Manage loans",
    description:
      "Make manual loan balance corrections and oversee every customer's account.",
  },
  "sale:create": {
    label: "Record sales",
    description: "Record a new sale, paid in cash or put on loan.",
  },
  "sale:read": {
    label: "View sales",
    description: "See the sales history.",
  },
  "user:manage": {
    label: "Manage users",
    description: "Create staff accounts and assign them a role.",
  },
  "role:manage": {
    label: "Manage roles",
    description:
      "Change what each role is allowed to do — the page you're on right now.",
  },
  "unit-conversion:manage": {
    label: "Manage unit settings",
    description:
      "Edit the Carton/Packet/Wax/Kir conversions used across stock and sales.",
  },
  "raw-material:read": {
    label: "View raw materials",
    description: "See the raw material catalog and current balances.",
  },
  "raw-material:record": {
    label: "Record raw material activity",
    description: "Log raw materials received or used up.",
  },
  "raw-material:manage": {
    label: "Manage raw materials",
    description: "Add and edit the raw material catalog.",
  },
};

export function DescribeModule(moduleName: string): ModuleLabel {
  return MODULE_LABELS[moduleName] ?? { label: moduleName, icon: GearSixIcon };
}

export function DescribePermission(permissionName: string): PermissionLabel {
  return (
    PERMISSION_LABELS[permissionName] ?? {
      label: permissionName,
      description: "",
    }
  );
}

// "MANAGER" -> "Manager", "INVENTORY_MANAGER" -> "Inventory Manager" — role
// names are plain uppercase-snake identifiers (see prisma/seed.ts's
// ROLES constant), not meant to be read as-is.
export function HumanizeRoleName(roleName: string): string {
  return roleName
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
