"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProducts } from "@/features/products/hooks/use-products";
import { useUnitConversions } from "@/features/unit-conversions/hooks/use-unit-conversions";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { useAcceptStock } from "../hooks/use-stock";

export function AcceptStockForm({ onSuccess }: { onSuccess: () => void }) {
  const { data: productsResult, isLoading: productsLoading } = useProducts({
    pageSize: MAX_PAGE_SIZE,
  });
  const { data: unitsResult, isLoading: unitsLoading } = useUnitConversions({
    pageSize: MAX_PAGE_SIZE,
  });
  const activeProducts =
    productsResult?.data.filter((product) => product.isActive) ?? [];
  const activeUnits = unitsResult?.data.filter((unit) => unit.isActive) ?? [];

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

    onSuccess();
  }

  const isReady = !productsLoading && !unitsLoading;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="accept-stock-product" className="text-sm font-medium">
          Product
        </label>
        <Select
          value={productId}
          onValueChange={setProductId}
          disabled={!isReady}
        >
          <SelectTrigger id="accept-stock-product" className="w-full">
            <SelectValue placeholder="Select a product" />
          </SelectTrigger>
          <SelectContent>
            {activeProducts.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name} ({product.sku})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label
            htmlFor="accept-stock-quantity"
            className="text-sm font-medium"
          >
            Quantity
          </label>
          <Input
            id="accept-stock-quantity"
            type="number"
            step="any"
            min="0"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="accept-stock-unit" className="text-sm font-medium">
            Unit
          </label>
          <Select
            value={unitName}
            onValueChange={setUnitName}
            disabled={!isReady}
          >
            <SelectTrigger id="accept-stock-unit" className="w-full">
              <SelectValue placeholder="Select a unit" />
            </SelectTrigger>
            <SelectContent>
              {activeUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.unitName}>
                  {unit.unitName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="accept-stock-note" className="text-sm font-medium">
          Note (optional)
        </label>
        <Input
          id="accept-stock-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
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
