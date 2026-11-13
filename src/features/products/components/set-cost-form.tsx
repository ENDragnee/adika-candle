"use client";

import { useSetNewProductCost } from "../hooks/use-costs";
import { AmountChangeForm } from "./amount-change-form";

export function SetCostForm({
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
  const setCost = useSetNewProductCost(productId);
  return (
    <AmountChangeForm
      kind="cost"
      currentPrice={currentPrice}
      currentCost={currentCost}
      isPending={setCost.isPending}
      onConfirm={async (amountPerKg) => {
        await setCost.mutateAsync({ amountPerKg });
        onSuccess();
      }}
    />
  );
}
