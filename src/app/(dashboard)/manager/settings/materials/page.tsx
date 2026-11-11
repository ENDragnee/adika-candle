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

  return <MaterialManager />;
}
