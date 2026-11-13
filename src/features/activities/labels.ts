import {
  ArchiveIcon,
  FlaskIcon,
  GearSixIcon,
  HandCoinsIcon,
  type Icon,
  PackageIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  SignInIcon,
  TagIcon,
  UsersIcon,
} from "@phosphor-icons/react";

// Display names and icons for activity `type`s (the area of the app).
export const ACTIVITY_TYPE_META: Record<string, { label: string; icon: Icon }> =
  {
    sales: { label: "Sales", icon: ReceiptIcon },
    stock: { label: "Stock", icon: ArchiveIcon },
    materials: { label: "Raw materials", icon: FlaskIcon },
    loans: { label: "Customer accounts", icon: HandCoinsIcon },
    customers: { label: "Customers", icon: UsersIcon },
    catalog: { label: "Products & categories", icon: PackageIcon },
    pricing: { label: "Prices & costs", icon: TagIcon },
    access: { label: "Users & roles", icon: ShieldCheckIcon },
    auth: { label: "Sign-ins", icon: SignInIcon },
    settings: { label: "Settings", icon: GearSixIcon },
  };

export function DescribeActivityType(type: string) {
  return ACTIVITY_TYPE_META[type] ?? { label: type, icon: GearSixIcon };
}

// Readable names for keys inside an activity's `changes`.
export function HumanizeKey(key: string): string {
  const spaced = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/Kg\b/, "(kg)")
    .replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}
