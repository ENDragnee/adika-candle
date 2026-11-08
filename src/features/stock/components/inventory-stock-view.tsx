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
import { StockBalanceList } from "./stock-balance-list";

export function InventoryStockView() {
  const [isAcceptOpen, setIsAcceptOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={isAcceptOpen} onOpenChange={setIsAcceptOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon data-icon="inline-start" />
              Accept stock
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Accept stock</DialogTitle>
            </DialogHeader>
            <AcceptStockForm onSuccess={() => setIsAcceptOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <StockBalanceList />
    </div>
  );
}
