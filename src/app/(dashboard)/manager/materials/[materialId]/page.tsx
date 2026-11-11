import { redirect } from "next/navigation";
import { MaterialDetail } from "@/features/raw-materials/components/material-detail";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function ManagerMaterialDetailPage(
  props: PageProps<"/manager/materials/[materialId]">,
) {
  const allowed = await CheckPermission("raw-material:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  const { materialId } = await props.params;

  return <MaterialDetail materialId={materialId} />;
}
