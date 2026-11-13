import { redirect } from "next/navigation";
import { ProductStockDetail } from "@/features/stock/components/product-stock-detail";
import { GetSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function ManagerStockDetailPage(
  props: PageProps<"/manager/stock/[productId]">,
) {
  const session = await GetSession();

  if (!session.user.permissions.includes("stock:read")) {
    redirect("/unauthorized");
  }

  const { productId } = await props.params;

  return (
    <ProductStockDetail
      productId={productId}
      canAdjust={session.user.permissions.includes("stock:adjust")}
    />
  );
}
