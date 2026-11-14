import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { UserManager } from "@/features/users/components/user-manager";
import { GetSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function UsersPage() {
  const session = await GetSession();

  if (!session.user.permissions.includes("user:manage")) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="Create accounts, rename them, assign roles, and deactivate access." />
      <UserManager
        currentUserId={session.user.id}
        canManageSessions={session.user.permissions.includes("session:manage")}
      />
    </div>
  );
}
