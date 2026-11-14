import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { ManagerDashboard } from "@/features/analytics/components/manager-dashboard";
import { SystemOverview } from "@/features/sessions/components/system-overview";
import { GetSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function ManagerDashboardPage() {
  const session = await GetSession();
  const permissions = session.user.permissions;

  if (!permissions.includes("analytics:read")) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader description="How today is going, what needs your attention, and where stock and money stand." />
      {/* Admin only (Epic 23). */}
      {permissions.includes("session:manage") && <SystemOverview />}
      <ManagerDashboard />
    </div>
  );
}
