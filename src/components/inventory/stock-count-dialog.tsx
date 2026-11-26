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
import {
  FormatPacking,
  FormatPackingBreakdown,
  PackingToCartons,
} from "@/lib/packing";

// "Record a stock count" (Epic 21), shared by finished-goods stock and raw
// materials. The person enters what they physically counted; the server
// records the difference from the recorded balance as a correction, with
// the reason, so the history explains every change. Live preview of the
// difference before saving. Finished goods are counted in cartons +
// packets + pieces; raw materials in kg.
type CountProps =
  | {
      kind: "packing";
      currentCartons: string;
      onSubmit: (input: {
        countedCartons: number;
        reason: string;
      }) => Promise<unknown>;
    }
  | {
      kind: "kg";
      currentKg: string;
      onSubmit: (input: {
        countedKg: number;
        reason: string;
      }) => Promise<unknown>;
    };

const PACKING_FIELDS = [
  { key: "cartons", label: "Cartons" },
  { key: "packets", label: "Packets" },
  { key: "pieces", label: "Pieces" },
] as const;

type PackingDraft = Record<(typeof PACKING_FIELDS)[number]["key"], string>;
const EMPTY_PACKING: PackingDraft = { cartons: "", packets: "", pieces: "" };

export function StockCountDialog(
  props: CountProps & { itemName: string; isPending: boolean },
) {
  const { itemName, isPending } = props;
  const [open, setOpen] = useState(false);
  const [countedKg, setCountedKg] = useState("");
  const [packing, setPacking] = useState<PackingDraft>(EMPTY_PACKING);
  const [reason, setReason] = useState("");

  const isPacking = props.kind === "packing";
  const hasPacking = Object.values(packing).some((value) => value !== "");
  const counted = isPacking
    ? hasPacking
      ? PackingToCartons({
          cartons: Number(packing.cartons || 0),
          packets: Number(packing.packets || 0),
          pieces: Number(packing.pieces || 0),
        })
      : null
    : countedKg === ""
      ? null
      : Number(countedKg);
  const current = Number(
    props.kind === "packing" ? props.currentCartons : props.currentKg,
  );
  const difference = counted === null ? null : counted - current;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (counted === null) return;
    if (props.kind === "packing") {
      await props.onSubmit({ countedCartons: counted, reason: reason.trim() });
    } else {
      await props.onSubmit({ countedKg: counted, reason: reason.trim() });
    }
    setCountedKg("");
    setPacking(EMPTY_PACKING);
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
              {isPacking ? FormatPackingBreakdown(current) : FormatKg(current)}
            </span>
          </div>
          {isPacking ? (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-medium">
                Counted on hand
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {PACKING_FIELDS.map((field) => (
                  <div key={field.key} className="flex flex-col gap-1">
                    <label
                      htmlFor={`count-${field.key}`}
                      className="text-xs text-muted-foreground"
                    >
                      {field.label}
                    </label>
                    <Input
                      id={`count-${field.key}`}
                      type="number"
                      step="1"
                      min="0"
                      inputMode="numeric"
                      value={packing[field.key]}
                      onChange={(event) =>
                        setPacking((draft) => ({
                          ...draft,
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          ) : (
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
                value={countedKg}
                onChange={(event) => setCountedKg(event.target.value)}
                required
              />
            </div>
          )}
          {difference !== null && Number.isFinite(difference) && (
            <p className="-mt-2 text-xs text-muted-foreground">
              {Math.abs(difference) < 1e-9
                ? "Matches the recorded balance — the count is still logged."
                : `Correction: ${
                    isPacking
                      ? FormatPacking(difference, "CARTON", { signed: true })
                      : FormatSignedKg(difference)
                  }`}
            </p>
          )}
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
                counted === null ||
                counted < 0 ||
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
