import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { RoleManager } from "@/features/roles/components/role-manager";
import { GetSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function RolesPage() {
  const session = await GetSession();

  if (!session.user.permissions.includes("role:manage")) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="Create roles and choose what each can do. The sidebar shows each person only the pages their role opens." />
      <RoleManager
        currentRoleName={session.user.role}
        viewerPermissions={session.user.permissions}
      />
    </div>
  );
}
