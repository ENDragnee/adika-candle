import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
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
      <PageHeader description="Sales trend, stock levels, loan exposure, and low-stock alerts." />
      <ManagerDashboard />
    </div>
  );
}
