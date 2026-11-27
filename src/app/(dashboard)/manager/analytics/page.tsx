import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { AnalyticsHub } from "@/features/analytics/components/analytics-hub";
import { COST_PERMISSION } from "@/features/products/cost-access";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function AnalyticsPage() {
  const allowed = await CheckPermission("analytics:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  const canSeeCost = await CheckPermission(COST_PERMISSION);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        description={
          canSeeCost
            ? "Production, profitability, stock health, and best sellers."
            : "Production, stock health, and best sellers."
        }
      />
      {/* AnalyticsHub reads ?tab= via useSearchParams. */}
      <Suspense>
        <AnalyticsHub canSeeCost={canSeeCost} />
      </Suspense>
    </div>
  );
}
