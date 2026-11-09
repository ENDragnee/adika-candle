import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { AnalyticsHub } from "@/features/analytics/components/analytics-hub";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function AnalyticsPage() {
  const allowed = await CheckPermission("analytics:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="Production, profitability, stock health, and best sellers." />
      <AnalyticsHub />
    </div>
  );
}
