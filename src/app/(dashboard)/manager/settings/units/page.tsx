import { redirect } from "next/navigation";
import { UnitConversionManager } from "@/features/unit-conversions/components/unit-conversion-manager";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function UnitConversionsSettingsPage() {
  const allowed = await CheckPermission("unit-conversion:manage");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return <UnitConversionManager />;
}
