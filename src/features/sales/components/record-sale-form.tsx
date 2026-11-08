"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { useProducts } from "@/features/products/hooks/use-products";
import { useUnitConversions } from "@/features/unit-conversions/hooks/use-unit-conversions";
import { useCreateSale } from "../hooks/use-sales";
import type { SalePaymentTypeSchema } from "../validators/sale.schema";

const WALK_IN_VALUE = "__walk-in__";

const inputClassName =
  "h-9 w-full rounded-none border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

type PaymentType = z.infer<typeof SalePaymentTypeSchema>;

export function RecordSaleForm() {
  const router = useRouter();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: units, isLoading: unitsLoading } = useUnitConversions();
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const activeProducts = products?.filter((product) => product.isActive) ?? [];
  const activeUnits = units?.filter((unit) => unit.isActive) ?? [];
  const activeCustomers =
    customers?.filter((customer) => customer.isActive) ?? [];

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitName, setUnitName] = useState("");
  const [customerSelection, setCustomerSelection] = useState(WALK_IN_VALUE);
  const [paymentType, setPaymentType] = useState<PaymentType>("CASH");
  const createSale = useCreateSale();

  const isWalkIn = customerSelection === WALK_IN_VALUE;

  function handleCustomerChange(value: string) {
    setCustomerSelection(value);

    // Walk-in sales can only ever be cash — force it back when switching to
    // walk-in instead of letting a stale LOAN selection slip through.
    if (value === WALK_IN_VALUE) {
      setPaymentType("CASH");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = isWalkIn
      ? {
          paymentType: "CASH" as const,
          productId,
          inputQuantity: Number(quantity),
          inputUnitName: unitName,
        }
      : {
          paymentType,
          productId,
          inputQuantity: Number(quantity),
          inputUnitName: unitName,
          customerId: customerSelection,
        };

    await createSale.mutateAsync(input);
    router.push("/inventory/sales");
  }

  const isReady = !productsLoading && !unitsLoading && !customersLoading;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="sale-product" className="text-sm font-medium">
          Product
        </label>
        <select
          id="sale-product"
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
          <label htmlFor="sale-quantity" className="text-sm font-medium">
            Quantity
          </label>
          <input
            id="sale-quantity"
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
          <label htmlFor="sale-unit" className="text-sm font-medium">
            Unit
          </label>
          <select
            id="sale-unit"
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
        <label htmlFor="sale-customer" className="text-sm font-medium">
          Customer
        </label>
        <select
          id="sale-customer"
          value={customerSelection}
          onChange={(event) => handleCustomerChange(event.target.value)}
          disabled={!isReady}
          className={inputClassName}
        >
          <option value={WALK_IN_VALUE}>Walk-in (no customer)</option>
          {activeCustomers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Payment</span>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name="payment-type"
              value="CASH"
              checked={paymentType === "CASH"}
              onChange={() => setPaymentType("CASH")}
            />
            Cash
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name="payment-type"
              value="LOAN"
              checked={paymentType === "LOAN"}
              disabled={isWalkIn}
              onChange={() => setPaymentType("LOAN")}
            />
            Loan (on credit)
          </label>
        </div>
        {isWalkIn && (
          <p className="text-sm text-muted-foreground">
            Walk-in sales must be paid in cash — select a customer to enable
            loan.
          </p>
        )}
      </div>
      {!unitsLoading && activeUnits.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No active units yet — ask a Manager to set one up under Settings.
        </p>
      )}
      {createSale.isError && (
        <p className="text-sm text-destructive">
          Couldn&apos;t record the sale — check the product has an active price
          and the quantity/unit are valid.
        </p>
      )}
      <Button
        type="submit"
        disabled={
          createSale.isPending ||
          !isReady ||
          activeProducts.length === 0 ||
          activeUnits.length === 0
        }
        className="mt-1"
      >
        {createSale.isPending ? "Recording…" : "Record sale"}
      </Button>
    </form>
  );
}
