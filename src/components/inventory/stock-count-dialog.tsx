"use client";

import { ClipboardTextIcon } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormatKg, FormatSignedKg } from "@/lib/format";
import type { StockCountInput } from "@/lib/schemas/stock-count.schema";

// "Record a stock count" (Epic 21), shared by finished-goods stock and raw
// materials. The person enters what they physically counted; the server
// records the difference from the recorded balance as a correction, with
// the reason, so the history explains every change. Live preview of the
// difference before saving.
export function StockCountDialog({
  itemName,
  currentKg,
  onSubmit,
  isPending,
}: {
  itemName: string;
  currentKg: string;
  onSubmit: (input: StockCountInput) => Promise<unknown>;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");

  const countedNumber = counted === "" ? null : Number(counted);
  const difference =
    countedNumber === null ? null : countedNumber - Number(currentKg);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (countedNumber === null) return;
    await onSubmit({ countedKg: countedNumber, reason: reason.trim() });
    setCounted("");
    setReason("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ClipboardTextIcon data-icon="inline-start" />
          Record stock count
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Record a stock count</DialogTitle>
            <DialogDescription>
              Enter how much {itemName} is physically on hand. The recorded
              balance is corrected to match, and the correction is kept in the
              history with your reason.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Recorded balance</span>
            <span className="font-medium tabular-nums">
              {FormatKg(currentKg)}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="count-kg" className="text-sm font-medium">
              Counted on hand (kg)
            </label>
            <Input
              id="count-kg"
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              value={counted}
              onChange={(event) => setCounted(event.target.value)}
              required
            />
            {difference !== null && Number.isFinite(difference) && (
              <p className="text-xs text-muted-foreground">
                {difference === 0
                  ? "Matches the recorded balance — the count is still logged."
                  : `Correction: ${FormatSignedKg(difference)}`}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="count-reason" className="text-sm font-medium">
              Reason
            </label>
            <Input
              id="count-reason"
              placeholder="e.g. Monthly stock take"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isPending ||
                countedNumber === null ||
                countedNumber < 0 ||
                reason.trim().length < 3
              }
            >
              {isPending ? "Saving…" : "Save count"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
