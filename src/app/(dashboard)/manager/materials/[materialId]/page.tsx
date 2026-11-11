import { redirect } from "next/navigation";
import { MaterialDetail } from "@/features/raw-materials/components/material-detail";
import { GetSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function ManagerMaterialDetailPage(
  props: PageProps<"/manager/materials/[materialId]">,
) {
  const session = await GetSession();

  if (!session.user.permissions.includes("raw-material:read")) {
    redirect("/unauthorized");
  }

  const { materialId } = await props.params;

  return (
    <MaterialDetail
      materialId={materialId}
      canAdjust={session.user.permissions.includes("stock:adjust")}
    />
  );
}
