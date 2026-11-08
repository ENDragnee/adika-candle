import { redirect } from "next/navigation";
import { ManagerDashboard } from "@/features/analytics/components/manager-dashboard";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function ManagerDashboardPage() {
  const allowed = await CheckPermission("analytics:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Manager dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sales trend, stock levels, loan exposure, and low-stock alerts.
        </p>
      </div>
      <ManagerDashboard />
    </div>
  );
}
