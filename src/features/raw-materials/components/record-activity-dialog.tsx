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
import { RecordActivityForm } from "./record-activity-form";

// "Record activity" (received / consumed) button + dialog. Shared by the
// Inventory Manager's and the Manager's materials pages — anyone holding
// raw-material:record can use it.
export function RecordActivityDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        <RecordActivityForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
