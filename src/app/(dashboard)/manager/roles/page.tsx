import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { RoleManager } from "@/features/roles/components/role-manager";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function RolesPage() {
  const allowed = await CheckPermission("role:manage");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="Edit which permissions each role has. Role names aren't editable here — only the permission assignments." />
      <RoleManager />
    </div>
  );
}
