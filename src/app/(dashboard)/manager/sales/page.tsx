import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import {
  type SaleRange,
  SaleList,
} from "@/features/sales/components/sale-list";
import { GetSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

const RANGES: SaleRange[] = ["today", "7d", "30d", "month", "all"];

export default async function ManagerSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await GetSession();

  if (!session.user.permissions.includes("sale:read")) {
    redirect("/unauthorized");
  }

  const { range } = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="Every sale, with totals for whatever you filter to. Void a mistaken sale from its row menu." />
      <SaleList
        showFilters
        canVoid={session.user.permissions.includes("sale:void")}
        initialRange={
          RANGES.includes(range as SaleRange) ? (range as SaleRange) : "30d"
        }
      />
    </div>
  );
}
