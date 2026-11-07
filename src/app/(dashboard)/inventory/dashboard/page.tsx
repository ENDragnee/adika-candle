import { redirect } from "next/navigation";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function InventoryDashboardPage() {
  const allowed = await CheckPermission("stock:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div>
      <h1 className="text-lg font-semibold">Inventory dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Stock levels and recent sales land here in Epic 8.
      </p>
    </div>
  );
}
