import { redirect } from "next/navigation";
import { InventorySalesView } from "@/features/sales/components/inventory-sales-view";
import { CheckPermission, GetApiSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function InventorySalesPage() {
  const allowed = await CheckPermission("sale:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  const session = await GetApiSession();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">My sales</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sales you've recorded.
        </p>
      </div>
      <InventorySalesView createdById={session?.user?.id} />
    </div>
  );
}
