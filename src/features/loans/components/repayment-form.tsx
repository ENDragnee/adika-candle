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
import { useCreateLoanTransaction } from "../hooks/use-loans";
import { LOAN_TRANSACTION_META } from "../labels";
import { BalancePreview } from "./balance-preview";

// Stand-alone loan activity not tied to a new sale — repayment and advance
// recording both roles can use (loan:record or loan:manage), see
// docs/DECISIONS.md "Loan repayment with no attached sale".
export function RepaymentForm({
  accountId,
  customerId,
  currentBalance,
  onSuccess,
}: {
  accountId: string;
  customerId: string;
  // Shown with a before → after preview when provided.
  currentBalance?: string;
  onSuccess: () => void;
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
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="repayment-type" className="text-sm font-medium">
          Type
        </label>
        <Select
          value={type}
          onValueChange={(value) =>
            setType(value as "REPAYMENT_RECEIVED" | "ADVANCE_FROM_CUSTOMER")
          }
        >
          <SelectTrigger id="repayment-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="REPAYMENT_RECEIVED">
              {LOAN_TRANSACTION_META.REPAYMENT_RECEIVED.label}
            </SelectItem>
            <SelectItem value="ADVANCE_FROM_CUSTOMER">
              {LOAN_TRANSACTION_META.ADVANCE_FROM_CUSTOMER.label}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="repayment-amount" className="text-sm font-medium">
          Amount
        </label>
        <Input
          id="repayment-amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="repayment-note" className="text-sm font-medium">
          Note (optional)
        </label>
        <Input
          id="repayment-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {LOAN_TRANSACTION_META[type].description}
      </p>
      {currentBalance !== undefined && (
        <BalancePreview
          current={Number(currentBalance)}
          delta={Number(amount) > 0 ? -Number(amount) : null}
        />
      )}
      <Button
        loading={createTransaction.isPending}
        type="submit"
        disabled={createTransaction.isPending}
      >
        {createTransaction.isPending ? "Recording…" : "Record"}
      </Button>
    </form>
  );
}
