"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCreateLoanTransaction } from "../hooks/use-loans";

const inputClassName =
  "h-9 w-full rounded-none border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

// Manager-only correction — permission-gated server-side to loan:manage
// even though this form is only ever rendered for a Manager session; see
// docs/epics/05-customers-loans.md's "type-conditional permission check".
export function ManualAdjustmentForm({
  accountId,
  customerId,
}: {
  accountId: string;
  customerId: string;
}) {
  const [direction, setDirection] = useState<"INCREASE" | "DECREASE">(
    "INCREASE",
  );
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const createTransaction = useCreateLoanTransaction(accountId, customerId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await createTransaction.mutateAsync({
      type: "MANUAL_ADJUSTMENT",
      amount: Number(amount),
      direction,
      note: note.trim() ? note.trim() : undefined,
    });

    setAmount("");
    setNote("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-3 border border-border p-3"
    >
      <h3 className="text-sm font-medium">Manual adjustment</h3>
      <div className="flex flex-col gap-1">
        <label htmlFor="adjustment-direction" className="text-sm font-medium">
          Direction
        </label>
        <select
          id="adjustment-direction"
          value={direction}
          onChange={(event) =>
            setDirection(event.target.value as "INCREASE" | "DECREASE")
          }
          className={inputClassName}
        >
          <option value="INCREASE">
            Increase balance (customer owes more)
          </option>
          <option value="DECREASE">
            Decrease balance (customer owes less)
          </option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="adjustment-amount" className="text-sm font-medium">
          Amount
        </label>
        <input
          id="adjustment-amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
          className={inputClassName}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="adjustment-note" className="text-sm font-medium">
          Note
        </label>
        <input
          id="adjustment-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={inputClassName}
        />
      </div>
      {createTransaction.isError && (
        <p className="text-sm text-destructive">
          Couldn&apos;t record this adjustment.
        </p>
      )}
      <Button
        type="submit"
        variant="secondary"
        disabled={createTransaction.isPending}
      >
        {createTransaction.isPending ? "Saving…" : "Apply adjustment"}
      </Button>
    </form>
  );
}
