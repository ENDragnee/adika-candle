"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSetNewProductCost } from "../hooks/use-costs";

export function SetCostForm({
  productId,
  onSuccess,
}: {
  productId: string;
  onSuccess: () => void;
}) {
  const [amountPerKg, setAmountPerKg] = useState("");
  const setCost = useSetNewProductCost(productId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await setCost.mutateAsync({ amountPerKg: Number(amountPerKg) });
    setAmountPerKg("");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="new-cost" className="text-sm font-medium">
          New cost / kg
        </label>
        <Input
          id="new-cost"
          type="number"
          step="0.01"
          min="0.01"
          value={amountPerKg}
          onChange={(event) => setAmountPerKg(event.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={setCost.isPending}>
        {setCost.isPending ? "Saving…" : "Set new cost"}
      </Button>
    </form>
  );
}
