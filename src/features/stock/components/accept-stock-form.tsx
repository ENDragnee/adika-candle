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
import { FormatKg } from "@/lib/format";
import { CARTON_SIZE_META, CartonsToKg } from "@/lib/packing";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { useAcceptStock } from "../hooks/use-stock";

// Stock from production, in cartons. The wax it used is taken off the Wax
// balance automatically (shown below so nobody records it twice).
export function AcceptStockForm({ onSuccess }: { onSuccess: () => void }) {
  const { data: productsResult, isLoading: productsLoading } = useProducts({
    pageSize: MAX_PAGE_SIZE,
  });
  const activeProducts =
    productsResult?.data.filter((product) => product.isActive) ?? [];

  const [productId, setProductId] = useState("");
  const [cartons, setCartons] = useState("");
  const [note, setNote] = useState("");
  const acceptStock = useAcceptStock();

  const product = activeProducts.find((item) => item.id === productId);
  const cartonCount = Number(cartons);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await acceptStock.mutateAsync({
      productId,
      cartons: cartonCount,
      note: note.trim() ? note.trim() : undefined,
    });

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="accept-stock-product" className="text-sm font-medium">
          Product
        </label>
        <Select
          value={productId}
          onValueChange={setProductId}
          disabled={productsLoading}
        >
          <SelectTrigger id="accept-stock-product" className="w-full">
            <SelectValue placeholder="Select a product" />
          </SelectTrigger>
          <SelectContent>
            {activeProducts.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name} · {CARTON_SIZE_META[item.cartonSize].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="accept-stock-cartons" className="text-sm font-medium">
          Cartons
        </label>
        <Input
          id="accept-stock-cartons"
          type="number"
          step="any"
          min="0"
          inputMode="decimal"
          value={cartons}
          onChange={(event) => setCartons(event.target.value)}
          required
        />
        {product && cartonCount > 0 && (
          <p className="text-xs text-muted-foreground">
            Uses {FormatKg(CartonsToKg(cartonCount, product.cartonSize))} of wax
            ({CARTON_SIZE_META[product.cartonSize].description}) — taken off the
            wax balance automatically.
          </p>
        )}
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
      <Button
        loading={acceptStock.isPending}
        type="submit"
        disabled={
          acceptStock.isPending ||
          productsLoading ||
          !product ||
          !(cartonCount > 0)
        }
        className="mt-1"
      >
        {acceptStock.isPending ? "Accepting…" : "Accept stock"}
      </Button>
    </form>
  );
}
