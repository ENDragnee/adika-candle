import { redirect } from "next/navigation";
import { ProductStockDetail } from "@/features/stock/components/product-stock-detail";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function ManagerStockDetailPage(
  props: PageProps<"/manager/stock/[productId]">,
) {
  const allowed = await CheckPermission("stock:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  const { productId } = await props.params;

  return <ProductStockDetail productId={productId} />;
}
