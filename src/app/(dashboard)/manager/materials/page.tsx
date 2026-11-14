import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { MaterialBalanceList } from "@/features/raw-materials/components/material-balance-list";
import { RecordActivityDialog } from "@/features/raw-materials/components/record-activity-dialog";
import { GetSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function ManagerMaterialsPage() {
  const session = await GetSession();
  const permissions = session.user.permissions;
  if (!permissions.includes("raw-material:read")) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="Current balances across all raw materials. Record incoming or consumed material, or select a material for its full ledger." />
      {permissions.includes("raw-material:record") && (
        <div className="flex justify-end">
          <RecordActivityDialog />
        </div>
      )}
      <MaterialBalanceList detailHrefBase="/manager/materials" />
    </div>
  );
}
