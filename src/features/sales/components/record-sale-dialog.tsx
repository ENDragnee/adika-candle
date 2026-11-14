"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RecordSaleForm } from "./record-sale-form";

// "Record sale" button + dialog. Shared by the Inventory Manager's and the
// Manager's sales pages — anyone holding sale:create can sell, including
// on account (a loan sale).
export function RecordSaleDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-tour="record-sale-trigger">
          <PlusIcon data-icon="inline-start" />
          Record sale
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record sale</DialogTitle>
        </DialogHeader>
        <RecordSaleForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
