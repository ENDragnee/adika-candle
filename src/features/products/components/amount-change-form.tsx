"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormatMoney, FormatPercent } from "@/lib/format";

function MarginOf(price: number | null, cost: number | null): number | null {
  if (price === null || cost === null || price <= 0) return null;
  return ((price - cost) / price) * 100;
}

// Shared by "Set new price" and "Set new cost" (Epic 21). A new amount
// takes effect immediately for every sale after it, so the form has a
// review step: old → new, the % change, and what it does to the margin,
// before anything is saved.
export function AmountChangeForm({
  kind,
  currentPrice,
  currentCost,
  isPending,
  onConfirm,
}: {
  kind: "price" | "cost";
  currentPrice: string | null;
  currentCost: string | null;
  isPending: boolean;
  onConfirm: (amountPerKg: number) => Promise<unknown>;
}) {
  const [amount, setAmount] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const current = kind === "price" ? currentPrice : currentCost;
  const currentNumber = current === null ? null : Number(current);
  const next = Number(amount);
  const changePercent =
    currentNumber && currentNumber > 0
      ? ((next - currentNumber) / currentNumber) * 100
      : null;
  const priceNumber = currentPrice === null ? null : Number(currentPrice);
  const costNumber = currentCost === null ? null : Number(currentCost);
  const marginBefore = MarginOf(priceNumber, costNumber);
  const marginAfter =
    kind === "price" ? MarginOf(next, costNumber) : MarginOf(priceNumber, next);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewing) {
      setReviewing(true);
      return;
    }
    await onConfirm(next);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!reviewing ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`new-${kind}`} className="text-sm font-medium">
            New {kind} per kg (ETB)
          </label>
          <Input
            id={`new-${kind}`}
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Current:{" "}
            {current === null ? "not set" : `${FormatMoney(current)} / kg`}
            {kind === "price"
              ? ". Sales already recorded keep the price they were sold at."
              : ". Sales already recorded keep the cost they were recorded with."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <span className="flex flex-col">
              <span className="text-xs text-muted-foreground">Now</span>
              <span className="font-semibold tabular-nums">
                {current === null ? "Not set" : FormatMoney(current)}
              </span>
            </span>
            <ArrowRightIcon className="size-4 text-muted-foreground" />
            <span className="flex flex-col">
              <span className="text-xs text-muted-foreground">New</span>
              <span className="font-semibold tabular-nums">
                {FormatMoney(next)}
              </span>
            </span>
            {changePercent !== null && (
              <span className="ml-auto text-sm font-medium tabular-nums">
                {FormatPercent(changePercent, { signed: true })}
              </span>
            )}
          </div>
          {marginAfter !== null && (
            <p className="text-sm">
              Margin per kg:{" "}
              {marginBefore !== null && (
                <>
                  <span className="tabular-nums">
                    {FormatPercent(marginBefore)}
                  </span>{" "}
                  →{" "}
                </>
              )}
              <span
                className="font-semibold tabular-nums"
                style={
                  marginAfter < 0
                    ? { color: "var(--color-status-critical)" }
                    : undefined
                }
              >
                {FormatPercent(marginAfter)}
              </span>
              {marginAfter < 0 && " — this sells below cost"}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Takes effect immediately for every new sale.
          </p>
        </div>
      )}
      <div className="flex gap-2">
        {reviewing && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setReviewing(false)}
          >
            Back
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1"
          disabled={isPending || !(next > 0)}
        >
          {isPending
            ? "Saving…"
            : reviewing
              ? `Confirm new ${kind}`
              : "Review change"}
        </Button>
      </div>
    </form>
  );
}
