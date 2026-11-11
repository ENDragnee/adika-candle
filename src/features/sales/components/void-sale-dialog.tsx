"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormatKg, FormatMoney } from "@/lib/format";
import { useVoidSale } from "../hooks/use-sales";
import type { SaleDTO } from "../validators/sale.schema";

// Voiding never deletes (Epic 21): the sale stays in history marked
// "Voided", its stock goes back on hand, and anything it added to the
// customer's account is taken back off. To fix a wrong sale, void it and
// record the correct one.
export function VoidSaleDialog({
  sale,
  open,
  onOpenChange,
}: {
  sale: SaleDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const voidSale = useVoidSale(sale.id);
  const trimmed = reason.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await voidSale.mutateAsync({ reason: trimmed });
    setReason("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Void sale {sale.referenceCode}?</DialogTitle>
            <DialogDescription>
              The sale stays in the history, marked as voided. This can't be
              undone — to correct a mistake, void it and record the right sale.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3 text-sm">
            <li>
              <span className="font-medium">{FormatKg(sale.quantityKg)}</span>{" "}
              of {sale.productName} goes back into stock.
            </li>
            {sale.paymentType === "LOAN" && sale.customerName && (
              <li>
                <span className="font-medium">
                  {FormatMoney(sale.totalAmount)}
                </span>{" "}
                comes off {sale.customerName}'s account.
              </li>
            )}
            <li className="text-muted-foreground">
              It no longer counts in sales totals or reports.
            </li>
          </ul>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="void-reason" className="text-sm font-medium">
              Reason
            </label>
            <Input
              id="void-reason"
              placeholder="e.g. Wrong product entered"
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
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={trimmed.length < 3 || voidSale.isPending}
            >
              {voidSale.isPending ? "Voiding…" : "Void sale"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
