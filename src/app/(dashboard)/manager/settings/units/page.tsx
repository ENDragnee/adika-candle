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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Unit conversions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Carton/Packet/Wax/Kir → KG ratios. Deactivating a unit hides it from
          new stock and sales entries without deleting its history.
        </p>
      </div>
      <UnitConversionManager />
    </div>
  );
}
