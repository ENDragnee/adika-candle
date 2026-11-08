"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCreateLoanTransaction } from "../hooks/use-loans";

const inputClassName =
  "h-9 w-full rounded-none border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

// Stand-alone loan activity not tied to a new sale — repayment and advance
// recording both roles can use (loan:record or loan:manage), see
// docs/DECISIONS.md "Loan repayment with no attached sale".
export function RepaymentForm({
  accountId,
  customerId,
}: {
  accountId: string;
  customerId: string;
}) {
  const [type, setType] = useState<
    "REPAYMENT_RECEIVED" | "ADVANCE_FROM_CUSTOMER"
  >("REPAYMENT_RECEIVED");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const createTransaction = useCreateLoanTransaction(accountId, customerId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await createTransaction.mutateAsync({
      type,
      amount: Number(amount),
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
      <h3 className="text-sm font-medium">Record repayment or advance</h3>
      <div className="flex flex-col gap-1">
        <label htmlFor="repayment-type" className="text-sm font-medium">
          Type
        </label>
        <select
          id="repayment-type"
          value={type}
          onChange={(event) =>
            setType(
              event.target.value as
                | "REPAYMENT_RECEIVED"
                | "ADVANCE_FROM_CUSTOMER",
            )
          }
          className={inputClassName}
        >
          <option value="REPAYMENT_RECEIVED">Repayment received</option>
          <option value="ADVANCE_FROM_CUSTOMER">Advance from customer</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="repayment-amount" className="text-sm font-medium">
          Amount
        </label>
        <input
          id="repayment-amount"
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
        <label htmlFor="repayment-note" className="text-sm font-medium">
          Note (optional)
        </label>
        <input
          id="repayment-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={inputClassName}
        />
      </div>
      {createTransaction.isError && (
        <p className="text-sm text-destructive">
          Couldn&apos;t record this transaction.
        </p>
      )}
      <Button type="submit" disabled={createTransaction.isPending}>
        {createTransaction.isPending ? "Recording…" : "Record"}
      </Button>
    </form>
  );
}
