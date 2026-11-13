"use client";

import { InfoIcon, WarningIcon } from "@phosphor-icons/react";
import { isAxiosError } from "axios";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { useProducts } from "@/features/products/hooks/use-products";
import { useStockBalances } from "@/features/stock/hooks/use-stock";
import { useUnitConversions } from "@/features/unit-conversions/hooks/use-unit-conversions";
import {
  DescribeLoanBalance,
  FormatKg,
  FormatMoney,
  FormatNumber,
} from "@/lib/format";
import { GetErrorMessage } from "@/lib/get-error-message";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { useCreateSale } from "../hooks/use-sales";
import { PAYMENT_TYPE_META } from "../labels";
import type { CreateSaleInput } from "../validators/sale.schema";

const WALK_IN_VALUE = "__walk-in__";

type PaymentType = "CASH" | "LOAN";

interface OversellPrompt {
  availableKg: string;
  requestedKg: string;
}

// The API answers 409 INSUFFICIENT_STOCK (with the available kg) when a
// sale would take stock below zero and allowOversell wasn't set.
function ReadOversell(error: unknown): OversellPrompt | null {
  if (!isAxiosError(error) || error.response?.status !== 409) return null;
  const data = error.response.data as {
    code?: string;
    availableKg?: string;
    requestedKg?: string;
  };
  return data.code === "INSUFFICIENT_STOCK"
    ? {
        availableKg: data.availableKg ?? "0",
        requestedKg: data.requestedKg ?? "0",
      }
    : null;
}

function SummaryRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          emphasis && "text-base font-semibold text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function RecordSaleForm({ onSuccess }: { onSuccess: () => void }) {
  const { data: productsResult, isLoading: productsLoading } = useProducts({
    pageSize: MAX_PAGE_SIZE,
  });
  const { data: unitsResult, isLoading: unitsLoading } = useUnitConversions({
    pageSize: MAX_PAGE_SIZE,
  });
  const { data: customersResult, isLoading: customersLoading } = useCustomers({
    pageSize: MAX_PAGE_SIZE,
  });
  const activeProducts =
    productsResult?.data.filter((product) => product.isActive) ?? [];
  const activeUnits = unitsResult?.data.filter((unit) => unit.isActive) ?? [];
  const activeCustomers =
    customersResult?.data.filter((customer) => customer.isActive) ?? [];

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitName, setUnitName] = useState("");
  const [customerSelection, setCustomerSelection] = useState(WALK_IN_VALUE);
  const [paymentType, setPaymentType] = useState<PaymentType>("CASH");
  const [oversell, setOversell] = useState<OversellPrompt | null>(null);
  const createSale = useCreateSale();

  const { data: stockResult } = useStockBalances(
    productId ? { productId } : {},
  );
  const stock = productId ? stockResult?.data[0] : undefined;

  const product = activeProducts.find((item) => item.id === productId);
  const unit = activeUnits.find((item) => item.unitName === unitName);
  const customer = activeCustomers.find(
    (item) => item.id === customerSelection,
  );
  const isWalkIn = customerSelection === WALK_IN_VALUE;

  const quantityNumber = Number(quantity);
  const quantityKg =
    unit && quantityNumber > 0 ? quantityNumber * Number(unit.ratioToKg) : null;
  const total =
    quantityKg !== null && product?.currentPrice
      ? quantityKg * Number(product.currentPrice)
      : null;
  const availableKg = stock ? Number(stock.quantityKg) : null;
  const wouldOversell =
    quantityKg !== null && availableKg !== null && quantityKg > availableKg;

  const balance = customer ? Number(customer.loanBalance) : 0;
  const creditUsed =
    paymentType === "LOAN" && total !== null && balance < 0
      ? Math.min(total, -balance)
      : 0;

  function ResetOversell() {
    setOversell(null);
  }

  function handleCustomerChange(value: string) {
    setCustomerSelection(value);
    ResetOversell();
    // Walk-in sales can only ever be cash — force it back when switching to
    // walk-in instead of letting a stale on-account selection slip through.
    if (value === WALK_IN_VALUE) setPaymentType("CASH");
  }

  async function Submit(allowOversell: boolean) {
    const base = {
      productId,
      inputQuantity: quantityNumber,
      inputUnitName: unitName,
      ...(allowOversell && { allowOversell: true }),
    };
    const input: CreateSaleInput = isWalkIn
      ? { paymentType: "CASH", ...base }
      : { paymentType, customerId: customerSelection, ...base };

    try {
      await createSale.mutateAsync(input);
      onSuccess();
    } catch (error) {
      const prompt = ReadOversell(error);
      if (prompt) {
        setOversell(prompt);
        return;
      }
      toast.error(GetErrorMessage(error, "Couldn't record sale"));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void Submit(false);
  }

  const isReady = !productsLoading && !unitsLoading && !customersLoading;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sale-product" className="text-sm font-medium">
          Product
        </label>
        <Select
          value={productId}
          onValueChange={(value) => {
            setProductId(value);
            ResetOversell();
          }}
          disabled={!isReady}
        >
          <SelectTrigger id="sale-product" className="w-full">
            <SelectValue placeholder="Select a product" />
          </SelectTrigger>
          <SelectContent>
            {activeProducts.map((item) => (
              <SelectItem
                key={item.id}
                value={item.id}
                // A product with no price can't be sold — the API rejects it.
                disabled={!item.currentPrice}
              >
                {item.name} ·{" "}
                {item.currentPrice
                  ? `${FormatMoney(item.currentPrice)}/kg`
                  : "no price set"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {product && availableKg !== null && (
          <p className="text-xs text-muted-foreground">
            On hand:{" "}
            <span
              className={cn(
                "font-medium tabular-nums",
                availableKg <= 0 ? "text-destructive" : "text-foreground",
              )}
            >
              {FormatKg(availableKg)}
            </span>
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="sale-quantity" className="text-sm font-medium">
            Quantity
          </label>
          <Input
            id="sale-quantity"
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            value={quantity}
            onChange={(event) => {
              setQuantity(event.target.value);
              ResetOversell();
            }}
            required
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="sale-unit" className="text-sm font-medium">
            Unit
          </label>
          <Select
            value={unitName}
            onValueChange={(value) => {
              setUnitName(value);
              ResetOversell();
            }}
            disabled={!isReady}
          >
            <SelectTrigger id="sale-unit" className="w-full">
              <SelectValue placeholder="Select a unit" />
            </SelectTrigger>
            <SelectContent>
              {activeUnits.map((item) => (
                <SelectItem key={item.id} value={item.unitName}>
                  {item.unitName} ({FormatNumber(item.ratioToKg)} kg)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sale-customer" className="text-sm font-medium">
          Customer
        </label>
        <Select
          value={customerSelection}
          onValueChange={handleCustomerChange}
          disabled={!isReady}
        >
          <SelectTrigger id="sale-customer" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={WALK_IN_VALUE}>Walk-in (no customer)</SelectItem>
            {activeCustomers.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {customer && (
          <p className="text-xs text-muted-foreground">
            {(() => {
              const described = DescribeLoanBalance(customer.loanBalance);
              return described.direction === "SETTLED"
                ? "Account is settled."
                : `${described.label}: ${described.amount}`;
            })()}
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Payment</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["CASH", "LOAN"] as const).map((type) => {
            const disabled = type === "LOAN" && isWalkIn;
            return (
              <label
                key={type}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                  paymentType === type
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/50",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  type="radio"
                  name="payment-type"
                  value={type}
                  className="accent-primary"
                  checked={paymentType === type}
                  disabled={disabled}
                  onChange={() => setPaymentType(type)}
                />
                {PAYMENT_TYPE_META[type].label}
              </label>
            );
          })}
        </div>
        {isWalkIn && (
          <p className="text-xs text-muted-foreground">
            Walk-in sales are cash only. Pick a customer to sell on account.
          </p>
        )}
      </fieldset>

      {quantityKg !== null && product && (
        <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3 text-sm">
          <SummaryRow label="Weight" value={FormatKg(quantityKg)} />
          <SummaryRow
            label="Price"
            value={`${FormatMoney(product.currentPrice)} / kg`}
          />
          {creditUsed > 0 && (
            <SummaryRow
              label="Paid from customer's credit"
              value={`−${FormatMoney(creditUsed)}`}
            />
          )}
          <SummaryRow label="Total" value={FormatMoney(total)} emphasis />
          {creditUsed > 0 && total !== null && (
            <p className="flex items-start gap-1.5 pt-1 text-xs text-muted-foreground">
              <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
              The customer's credit is spent first;{" "}
              {total - creditUsed > 0
                ? `${FormatMoney(total - creditUsed)} is added to what they owe.`
                : "nothing is added to what they owe."}
            </p>
          )}
        </div>
      )}

      {wouldOversell && !oversell && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <WarningIcon
            weight="fill"
            className="mt-0.5 size-3.5 shrink-0"
            style={{ color: "var(--color-status-warning)" }}
          />
          This is more than the {FormatKg(availableKg)} recorded on hand. You'll
          be asked to confirm.
        </p>
      )}

      {oversell && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg border p-3 text-sm"
          style={{
            borderColor:
              "color-mix(in oklab, var(--color-status-warning) 60%, transparent)",
            backgroundColor:
              "color-mix(in oklab, var(--color-status-warning) 10%, transparent)",
          }}
        >
          <p className="font-medium">Not enough stock on record</p>
          <p className="text-muted-foreground">
            Only {FormatKg(oversell.availableKg)} is recorded on hand, but this
            sale is {FormatKg(oversell.requestedKg)}. If the goods are really
            there, record the sale anyway and do a stock count afterwards so the
            numbers match.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void Submit(true)}
              disabled={createSale.isPending}
            >
              Record anyway
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={ResetOversell}
            >
              Change quantity
            </Button>
          </div>
        </div>
      )}

      {!unitsLoading && activeUnits.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No active units yet — ask a Manager to set one up under Settings.
        </p>
      )}
      {!oversell && (
        <Button
          type="submit"
          disabled={
            createSale.isPending ||
            !isReady ||
            !product ||
            !unit ||
            !(quantityNumber > 0)
          }
        >
          {createSale.isPending
            ? "Recording…"
            : total !== null
              ? `Record sale · ${FormatMoney(total)}`
              : "Record sale"}
        </Button>
      )}
    </form>
  );
}
