import { redirect } from "next/navigation";
import { Suspense } from "react";
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

  // ProductDetail reads ?tab= via useSearchParams.
  return (
    <Suspense>
      <ProductDetail productId={id} canManage={canManage} />
    </Suspense>
  );
}
