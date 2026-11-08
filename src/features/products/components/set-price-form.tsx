"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSetNewProductPrice } from "../hooks/use-prices";

export function SetPriceForm({
  productId,
  onSuccess,
}: {
  productId: string;
  onSuccess: () => void;
}) {
  const [amountPerKg, setAmountPerKg] = useState("");
  const setPrice = useSetNewProductPrice(productId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await setPrice.mutateAsync({ amountPerKg: Number(amountPerKg) });
    setAmountPerKg("");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="new-price" className="text-sm font-medium">
          New price / kg
        </label>
        <Input
          id="new-price"
          type="number"
          step="0.01"
          min="0.01"
          value={amountPerKg}
          onChange={(event) => setAmountPerKg(event.target.value)}
          required
        />
      </div>
      {setPrice.isError && (
        <p className="text-sm text-destructive">Couldn&apos;t set price.</p>
      )}
      <Button type="submit" disabled={setPrice.isPending}>
        {setPrice.isPending ? "Saving…" : "Set new price"}
      </Button>
    </form>
  );
}
