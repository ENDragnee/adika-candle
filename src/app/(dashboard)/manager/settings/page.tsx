import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

const SETTINGS_LINKS = [
  {
    href: "/manager/settings/units",
    label: "Unit conversions",
    description:
      "Edit Carton/Packet/Wax/Kir → KG ratios used by stock and sales.",
  },
  {
    href: "/manager/settings/materials",
    label: "Raw materials",
    description:
      "Manage the wax/color-dye catalog used by production tracking.",
  },
];

export default async function SettingsPage() {
  const allowed = await CheckPermission("unit-conversion:manage");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="System-wide configuration." />
      <div className="flex flex-col gap-2">
        {SETTINGS_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="border border-border p-3 transition-colors hover:bg-muted/50"
          >
            <div className="text-sm font-medium">{link.label}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {link.description}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
