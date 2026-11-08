import { redirect } from "next/navigation";
import { AcceptStockForm } from "@/features/stock/components/accept-stock-form";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function AcceptStockPage() {
  const allowed = await CheckPermission("stock:accept");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Accept stock</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record incoming stock for a product. Quantity is converted to kg using
          the selected unit's current ratio.
        </p>
      </div>
      <AcceptStockForm />
    </div>
  );
}
