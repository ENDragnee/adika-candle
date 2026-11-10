import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { SettingsLinks } from "@/features/settings/components/settings-links";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function SettingsPage() {
  const allowed = await CheckPermission("unit-conversion:manage");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="A couple of factory-wide settings that rarely change." />
      <SettingsLinks />
    </div>
  );
}
