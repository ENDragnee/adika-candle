import { redirect } from "next/navigation";
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
      <div>
        <h1 className="text-lg font-semibold">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create accounts, assign roles, and deactivate access.
        </p>
      </div>
      <UserManager currentUserId={session.user.id} />
    </div>
  );
}
