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
import { SaleList } from "./sale-list";

export function InventorySalesView({ createdById }: { createdById?: string }) {
  const [isRecordOpen, setIsRecordOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
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
            <RecordSaleForm onSuccess={() => setIsRecordOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <SaleList createdById={createdById} linkBase="/inventory" />
    </div>
  );
}
