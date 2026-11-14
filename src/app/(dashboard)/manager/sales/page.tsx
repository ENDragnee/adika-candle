import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { RecordSaleDialog } from "@/features/sales/components/record-sale-dialog";
import {
  SaleList,
  type SaleRange,
} from "@/features/sales/components/sale-list";
import { GetSystemSettings } from "@/features/system/server/settings";
import { GetSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

const RANGES: SaleRange[] = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "90d",
  "month",
  "last-month",
  "year",
  "all",
];

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
  const { periodLock } = await GetSystemSettings();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="Every sale, with totals for whatever you filter to. Void a mistaken sale from its row menu." />
      {session.user.permissions.includes("sale:create") && (
        <div className="flex justify-end">
          <RecordSaleDialog />
        </div>
      )}
      <SaleList
        showFilters
        canVoid={session.user.permissions.includes("sale:void")}
        canRestore={session.user.permissions.includes("sale:restore")}
        lockedThrough={periodLock.lockedThrough}
        initialRange={
          RANGES.includes(range as SaleRange) ? (range as SaleRange) : "30d"
        }
      />
    </div>
  );
}
