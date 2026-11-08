import { redirect } from "next/navigation";
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
      <div>
        <h1 className="text-lg font-semibold">Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit which permissions each role has. Role names aren&apos;t editable
          here — only the permission assignments.
        </p>
      </div>
      <RoleManager />
    </div>
  );
}
