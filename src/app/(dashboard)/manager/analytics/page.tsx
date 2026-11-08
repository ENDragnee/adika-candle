import { redirect } from "next/navigation";
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
      <div>
        <h1 className="text-lg font-semibold">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Production, profitability, stock health, and best sellers.
        </p>
      </div>
      <AnalyticsHub />
    </div>
  );
}
