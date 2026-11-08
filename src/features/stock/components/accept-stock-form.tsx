"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/features/products/hooks/use-products";
import { useUnitConversions } from "@/features/unit-conversions/hooks/use-unit-conversions";
import { useAcceptStock } from "../hooks/use-stock";

const inputClassName =
  "h-9 w-full rounded-none border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

export function AcceptStockForm() {
  const router = useRouter();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: units, isLoading: unitsLoading } = useUnitConversions();
  const activeProducts = products?.filter((product) => product.isActive) ?? [];
  const activeUnits = units?.filter((unit) => unit.isActive) ?? [];

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitName, setUnitName] = useState("");
  const [note, setNote] = useState("");
  const acceptStock = useAcceptStock();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await acceptStock.mutateAsync({
      productId,
      quantity: Number(quantity),
      unitName,
      note: note.trim() ? note.trim() : undefined,
    });

    router.push("/inventory/stock");
  }

  const isReady = !productsLoading && !unitsLoading;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="accept-stock-product" className="text-sm font-medium">
          Product
        </label>
        <select
          id="accept-stock-product"
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          required
          disabled={!isReady}
          className={inputClassName}
        >
          <option value="" disabled>
            Select a product
          </option>
          {activeProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.sku})
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label
            htmlFor="accept-stock-quantity"
            className="text-sm font-medium"
          >
            Quantity
          </label>
          <input
            id="accept-stock-quantity"
            type="number"
            step="any"
            min="0"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
            className={inputClassName}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="accept-stock-unit" className="text-sm font-medium">
            Unit
          </label>
          <select
            id="accept-stock-unit"
            value={unitName}
            onChange={(event) => setUnitName(event.target.value)}
            required
            disabled={!isReady}
            className={inputClassName}
          >
            <option value="" disabled>
              Select a unit
            </option>
            {activeUnits.map((unit) => (
              <option key={unit.id} value={unit.unitName}>
                {unit.unitName}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="accept-stock-note" className="text-sm font-medium">
          Note (optional)
        </label>
        <input
          id="accept-stock-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={inputClassName}
        />
      </div>
      {!unitsLoading && activeUnits.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No active units yet — ask a Manager to set one up under Settings.
        </p>
      )}
      {acceptStock.isError && (
        <p className="text-sm text-destructive">
          Couldn&apos;t accept stock — check the quantity and unit.
        </p>
      )}
      <Button
        type="submit"
        disabled={
          acceptStock.isPending ||
          !isReady ||
          activeProducts.length === 0 ||
          activeUnits.length === 0
        }
        className="mt-1"
      >
        {acceptStock.isPending ? "Accepting…" : "Accept stock"}
      </Button>
    </form>
  );
}
