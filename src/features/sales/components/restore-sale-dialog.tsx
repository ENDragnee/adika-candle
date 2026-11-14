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
import { useRestoreSale } from "../hooks/use-sales";
import type { SaleDTO } from "../validators/sale.schema";

// The mirror of VoidSaleDialog (Epic 24, Admin): the sale counts again,
// its stock is taken again, and its account amount applies again.
export function RestoreSaleDialog({
  sale,
  open,
  onOpenChange,
}: {
  sale: SaleDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const restoreSale = useRestoreSale(sale.id);
  const trimmed = reason.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await restoreSale.mutateAsync({ reason: trimmed });
    setReason("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Restore sale {sale.referenceCode}?</DialogTitle>
            <DialogDescription>
              Voided{sale.voidReason ? ` because: “${sale.voidReason}”` : ""}.
              Restoring makes it a normal sale again.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3 text-sm">
            <li>
              <span className="font-medium">{FormatKg(sale.quantityKg)}</span>{" "}
              of {sale.productName} is taken out of stock again.
            </li>
            {sale.paymentType === "LOAN" && sale.customerName && (
              <li>
                <span className="font-medium">
                  {FormatMoney(sale.totalAmount)}
                </span>{" "}
                goes back on {sale.customerName}'s account.
              </li>
            )}
            <li className="text-muted-foreground">
              It counts in sales totals and reports again.
            </li>
          </ul>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="restore-reason" className="text-sm font-medium">
              Reason
            </label>
            <Input
              id="restore-reason"
              placeholder="e.g. Voided by mistake"
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
              loading={restoreSale.isPending}
              disabled={trimmed.length < 3}
            >
              Restore sale
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
