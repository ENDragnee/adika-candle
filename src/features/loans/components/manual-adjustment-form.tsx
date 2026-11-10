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

// Manager-only correction — permission-gated server-side to loan:manage
// even though this form is only ever rendered for a Manager session; see
// docs/epics/05-customers-loans.md's "type-conditional permission check".
export function ManualAdjustmentForm({
  accountId,
  customerId,
  onSuccess,
}: {
  accountId: string;
  customerId: string;
  onSuccess: () => void;
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
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="adjustment-direction" className="text-sm font-medium">
          Direction
        </label>
        <Select
          value={direction}
          onValueChange={(value) =>
            setDirection(value as "INCREASE" | "DECREASE")
          }
        >
          <SelectTrigger id="adjustment-direction" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INCREASE">
              Increase balance (customer owes more)
            </SelectItem>
            <SelectItem value="DECREASE">
              Decrease balance (customer owes less)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="adjustment-amount" className="text-sm font-medium">
          Amount
        </label>
        <Input
          id="adjustment-amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="adjustment-note" className="text-sm font-medium">
          Note
        </label>
        <Input
          id="adjustment-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
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
