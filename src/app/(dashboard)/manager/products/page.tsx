import { redirect } from "next/navigation";
import { NewProductLink } from "@/features/products/components/new-product-link";
import { ProductList } from "@/features/products/components/product-list";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function ProductsPage() {
  const allowed = await CheckPermission("product:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  const canManage = await CheckPermission("product:manage");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What&apos;s sellable, by category, with its current price.
          </p>
        </div>
        {canManage && <NewProductLink />}
      </div>
      <ProductList />
    </div>
  );
}
