import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { ActivityLog } from "@/features/activities/components/activity-log";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function ActivitiesPage() {
  const allowed = await CheckPermission("activity:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="Everything anyone changed in the system, and every sign-in — newest first." />
      <ActivityLog />
    </div>
  );
}
