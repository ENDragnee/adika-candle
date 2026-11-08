"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateLoanTransaction } from "../hooks/use-loans";

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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Record repayment or advance</CardTitle>
      </CardHeader>
      <CardContent>
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
                  Repayment received
                </SelectItem>
                <SelectItem value="ADVANCE_FROM_CUSTOMER">
                  Advance from customer
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
          {createTransaction.isError && (
            <p className="text-sm text-destructive">
              Couldn&apos;t record this transaction.
            </p>
          )}
          <Button type="submit" disabled={createTransaction.isPending}>
            {createTransaction.isPending ? "Recording…" : "Record"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
