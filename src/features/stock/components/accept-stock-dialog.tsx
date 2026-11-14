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
import { AcceptStockForm } from "./accept-stock-form";

// "Accept stock" button + dialog. Shared by the Inventory Manager's and the
// Manager's stock pages — anyone holding stock:accept can receive stock.
export function AcceptStockDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-tour="accept-stock-trigger">
          <PlusIcon data-icon="inline-start" />
          Accept stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept stock</DialogTitle>
        </DialogHeader>
        <AcceptStockForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
