import { redirect } from "next/navigation";
import { MaterialManager } from "@/features/raw-materials/components/material-manager";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function MaterialsSettingsPage() {
  const allowed = await CheckPermission("raw-material:manage");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Raw materials</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The catalog of production inputs (wax, color dye) tracked separately
          from finished-goods stock. Deactivating a material hides it from new
          activity entries and recipe rows without deleting its history.
        </p>
      </div>
      <MaterialManager />
    </div>
  );
}
