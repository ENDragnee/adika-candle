"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSetNewProductPrice } from "../hooks/use-prices";

export function SetPriceForm({ productId }: { productId: string }) {
  const [amountPerKg, setAmountPerKg] = useState("");
  const setPrice = useSetNewProductPrice(productId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await setPrice.mutateAsync({ amountPerKg: Number(amountPerKg) });
    setAmountPerKg("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="new-price" className="text-sm font-medium">
          New price / kg
        </label>
        <input
          id="new-price"
          type="number"
          step="0.01"
          min="0.01"
          value={amountPerKg}
          onChange={(event) => setAmountPerKg(event.target.value)}
          required
          className="h-8 w-32 rounded-none border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
        />
      </div>
      <Button type="submit" disabled={setPrice.isPending}>
        {setPrice.isPending ? "Saving…" : "Set new price"}
      </Button>
      {setPrice.isError && (
        <p className="text-sm text-destructive">Couldn&apos;t set price.</p>
      )}
    </form>
  );
}
