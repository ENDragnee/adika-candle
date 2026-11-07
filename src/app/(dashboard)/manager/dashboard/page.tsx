import { redirect } from "next/navigation";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function ManagerDashboardPage() {
  const allowed = await CheckPermission("analytics:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div>
      <h1 className="text-lg font-semibold">Manager dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Analytics and reporting land here in Epic 8.
      </p>
    </div>
  );
}
