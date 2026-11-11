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
import { MaterialBalanceList } from "./material-balance-list";
import { RecordActivityForm } from "./record-activity-form";

export function InventoryMaterialsView() {
  const [isRecordOpen, setIsRecordOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon data-icon="inline-start" />
              Record activity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record activity</DialogTitle>
            </DialogHeader>
            <RecordActivityForm onSuccess={() => setIsRecordOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <MaterialBalanceList />
    </div>
  );
}
