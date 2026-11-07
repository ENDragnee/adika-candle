import { redirect } from "next/navigation";
import { CreateProductForm } from "@/features/products/components/create-product-form";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function NewProductPage() {
  const allowed = await CheckPermission("product:manage");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">New product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set a price once the product is created.
        </p>
      </div>
      <CreateProductForm />
    </div>
  );
}
