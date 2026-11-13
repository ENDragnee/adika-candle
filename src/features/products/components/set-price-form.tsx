"use client";

import { useSetNewProductPrice } from "../hooks/use-prices";
import { AmountChangeForm } from "./amount-change-form";

export function SetPriceForm({
  productId,
  currentPrice,
  currentCost,
  onSuccess,
}: {
  productId: string;
  currentPrice: string | null;
  currentCost: string | null;
  onSuccess: () => void;
}) {
  const setPrice = useSetNewProductPrice(productId);
  return (
    <AmountChangeForm
      kind="price"
      currentPrice={currentPrice}
      currentCost={currentCost}
      isPending={setPrice.isPending}
      onConfirm={async (amountPerKg) => {
        await setPrice.mutateAsync({ amountPerKg });
        onSuccess();
      }}
    />
  );
}
