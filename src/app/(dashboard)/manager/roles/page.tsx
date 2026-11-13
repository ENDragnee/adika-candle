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
      <PageHeader description="Turn features on or off for each role. The sidebar shows each person only the pages their role can open." />
      <RoleManager currentRoleName={session.user.role} />
    </div>
  );
}
