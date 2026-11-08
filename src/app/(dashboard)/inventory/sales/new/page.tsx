import { redirect } from "next/navigation";
import { RecordSaleForm } from "@/features/sales/components/record-sale-form";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function RecordSalePage() {
  const allowed = await CheckPermission("sale:create");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Record sale</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a product and quantity, a customer or walk-in, and cash or loan.
          This decrements stock and, for loan sales, posts to the customer's
          loan account.
        </p>
      </div>
      <RecordSaleForm />
    </div>
  );
}
