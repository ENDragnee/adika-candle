import { redirect } from "next/navigation";
import { ProductDetail } from "@/features/products/components/product-detail";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function ProductDetailPage(
  props: PageProps<"/manager/products/[id]">,
) {
  const allowed = await CheckPermission("product:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  const canManage = await CheckPermission("product:manage");
  const { id } = await props.params;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Product</h1>
      <ProductDetail productId={id} canManage={canManage} />
    </div>
  );
}
