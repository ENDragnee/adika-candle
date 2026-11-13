import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { CreateProductTrigger } from "@/features/products/components/create-product-trigger";
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
      {/* One header pattern everywhere (Epic 21): title + description
          live in the TopBar; page actions sit right-aligned above the
          content. This page used to repeat "Products" in its own h1. */}
      <PageHeader description="Everything you sell, with its current price, cost, and margin." />
      {canManage && (
        <div className="flex justify-end">
          <CreateProductTrigger />
        </div>
      )}
      <ProductList />
    </div>
  );
}
