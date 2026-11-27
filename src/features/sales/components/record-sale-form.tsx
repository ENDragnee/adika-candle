"use client";

import { InfoIcon, WarningIcon } from "@phosphor-icons/react";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { NotifyError } from "@/components/feedback/notify-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerSearch } from "@/features/customers/components/customer-search";
import type { CustomerDTO } from "@/features/customers/validators/customer.schema";
import { useProducts } from "@/features/products/hooks/use-products";
import { useStockBalances } from "@/features/stock/hooks/use-stock";
import { useSaleUnitMode } from "@/lib/feature-flags/use-flags";
import { FormatMoney } from "@/lib/format";
import {
  FormatSaleQuantity,
  FormatSaleUnits,
  PACKETS_PER_CARTON,
} from "@/lib/packing";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { useCreateSale } from "../hooks/use-sales";
import { PAYMENT_TYPE_META } from "../labels";

type PaymentType = "CASH" | "LOAN";

interface OversellPrompt {
  availableCartons: string;
  requestedCartons: string;
}

// The API answers 409 INSUFFICIENT_STOCK (with the available cartons)
// when a sale would take stock below zero and allowOversell wasn't set.
function ReadOversell(error: unknown): OversellPrompt | null {
  if (!isAxiosError(error) || error.response?.status !== 409) return null;
  const data = error.response.data as {
    code?: string;
    availableCartons?: string;
    requestedCartons?: string;
  };
  return data.code === "INSUFFICIENT_STOCK"
    ? {
        availableCartons: data.availableCartons ?? "0",
        requestedCartons: data.requestedCartons ?? "0",
      }
    : null;
}

// 400 UNIT_NOT_ALLOWED: the Admin changed the sale units after this page
// loaded.
function IsUnitNotAllowed(error: unknown): boolean {
  return (
    isAxiosError(error) &&
    (error.response?.data as { code?: string } | undefined)?.code ===
      "UNIT_NOT_ALLOWED"
  );
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

// Sales are in cartons, packets or both — whichever the sale-unit-mode
// flag allows (the API re-checks) — and always to a named customer (added
// on the spot from the customer search if they're new). Packets are
// priced at the carton price ÷ 30.
export function RecordSaleForm({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter();
  const mode = useSaleUnitMode();
  const showCartons = mode !== "PACKET";
  const showPackets = mode !== "CARTON";
  const { data: productsResult, isLoading: productsLoading } = useProducts({
    pageSize: MAX_PAGE_SIZE,
  });
  const activeProducts =
    productsResult?.data.filter((product) => product.isActive) ?? [];

  const [productId, setProductId] = useState("");
  const [cartons, setCartons] = useState("");
  const [packets, setPackets] = useState("");
  const [customer, setCustomer] = useState<CustomerDTO | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>("CASH");
  const [oversell, setOversell] = useState<OversellPrompt | null>(null);
  const createSale = useCreateSale();

  const { data: stockResult } = useStockBalances(
    productId ? { productId } : {},
  );
  const stock = productId ? stockResult?.data[0] : undefined;
  const product = activeProducts.find((item) => item.id === productId);

  // A hidden unit counts as zero, so switching modes can't send it.
  const cartonCount = showCartons ? Number(cartons) || 0 : 0;
  const packetCount = showPackets ? Number(packets) || 0 : 0;
  const quantityValid =
    cartonCount >= 0 && Number.isInteger(packetCount) && packetCount >= 0;
  const soldCartons = cartonCount + packetCount / PACKETS_PER_CARTON;
  const hasQuantity = quantityValid && soldCartons > 0;
  const pricePerCarton = product?.currentPrice
    ? Number(product.currentPrice)
    : null;
  const total =
    hasQuantity && pricePerCarton !== null
      ? Math.round(soldCartons * pricePerCarton * 100) / 100
      : null;
  const priceLabel =
    pricePerCarton === null
      ? "—"
      : [
          showCartons && `${FormatMoney(pricePerCarton)} / carton`,
          showPackets &&
            `${FormatMoney(pricePerCarton / PACKETS_PER_CARTON)} / packet`,
        ]
          .filter(Boolean)
          .join(" · ");
  const availableCartons = stock ? Number(stock.quantityCartons) : null;
  const wouldOversell =
    hasQuantity &&
    availableCartons !== null &&
    // Carton counts come back at 6 dp; don't warn over that rounding.
    soldCartons > availableCartons + 1e-6;

  const balance = customer ? Number(customer.loanBalance) : 0;
  const creditUsed =
    paymentType === "LOAN" && total !== null && balance < 0
      ? Math.min(total, -balance)
      : 0;

  function ResetOversell() {
    setOversell(null);
  }

  async function Submit(allowOversell: boolean) {
    if (!customer) return;
    try {
      await createSale.mutateAsync({
        productId,
        customerId: customer.id,
        cartons: cartonCount,
        packets: packetCount,
        paymentType,
        ...(allowOversell && { allowOversell: true }),
      });
      onSuccess();
    } catch (error) {
      const prompt = ReadOversell(error);
      if (prompt) {
        setOversell(prompt);
        return;
      }
      // Pick up the new mode so the form shows the right inputs.
      if (IsUnitNotAllowed(error)) router.refresh();
      NotifyError(error, "Couldn't record sale");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void Submit(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sale-customer" className="text-sm font-medium">
          Customer
        </label>
        <CustomerSearch value={customer} onChange={setCustomer} />
      </div>

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
          disabled={productsLoading}
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
                {!item.currentPrice
                  ? "no price set"
                  : mode === "PACKET"
                    ? `${FormatMoney(Number(item.currentPrice) / PACKETS_PER_CARTON)} / packet`
                    : `${FormatMoney(item.currentPrice)} / carton`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {product && availableCartons !== null && (
          <p className="text-xs text-muted-foreground">
            Remaining:{" "}
            <span
              className={cn(
                "font-medium tabular-nums",
                availableCartons <= 0 ? "text-destructive" : "text-foreground",
              )}
            >
              {FormatSaleUnits(availableCartons, mode)}
            </span>
          </p>
        )}
      </div>

      <div className={cn("grid gap-3", mode === "BOTH" && "grid-cols-2")}>
        {showCartons && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sale-cartons" className="text-sm font-medium">
              Cartons
            </label>
            <Input
              id="sale-cartons"
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              placeholder={mode === "BOTH" ? "0" : undefined}
              value={cartons}
              onChange={(event) => {
                setCartons(event.target.value);
                ResetOversell();
              }}
              required={mode === "CARTON"}
            />
          </div>
        )}
        {showPackets && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sale-packets" className="text-sm font-medium">
              Packets
            </label>
            <Input
              id="sale-packets"
              type="number"
              step="1"
              min="0"
              inputMode="numeric"
              placeholder={mode === "BOTH" ? "0" : undefined}
              value={packets}
              onChange={(event) => {
                setPackets(event.target.value);
                ResetOversell();
              }}
              required={mode === "PACKET"}
            />
          </div>
        )}
      </div>
      {showPackets && (
        <p className="-mt-2 text-xs text-muted-foreground">
          {PACKETS_PER_CARTON} packets make a carton.
        </p>
      )}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Payment</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["CASH", "LOAN"] as const).map((type) => (
            <label
              key={type}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                paymentType === type
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <input
                type="radio"
                name="payment-type"
                value={type}
                className="accent-primary"
                checked={paymentType === type}
                onChange={() => setPaymentType(type)}
              />
              {PAYMENT_TYPE_META[type].label}
            </label>
          ))}
        </div>
      </fieldset>

      {hasQuantity && product && (
        <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3 text-sm">
          <SummaryRow
            label="Quantity"
            value={FormatSaleQuantity(
              {
                cartons: soldCartons,
                inputUnitName: packetCount > 0 ? "PACKET" : "CARTON",
              },
              mode,
            )}
          />
          <SummaryRow label="Price" value={priceLabel} />
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
          This is more than the {FormatSaleUnits(availableCartons, mode)}{" "}
          remaining. You'll be asked to confirm.
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
            Only {FormatSaleUnits(oversell.availableCartons, mode)} is recorded,
            but this sale is {FormatSaleUnits(oversell.requestedCartons, mode)}.
            If the goods are really there, record the sale anyway and do a stock
            count afterwards so the numbers match.
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

      {!oversell && (
        <Button
          loading={createSale.isPending}
          type="submit"
          disabled={
            createSale.isPending ||
            productsLoading ||
            !product ||
            !customer ||
            !hasQuantity
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
