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
import { CreateProductForm } from "./create-product-form";

// Split out from the (Server Component) products page so the
// @phosphor-icons/react import stays inside a Client Component — see
// docs/DECISIONS.md, "Epic 9 decisions" ("Phosphor icon components
// required 'use client'...").
export function CreateProductTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon data-icon="inline-start" />
          New product
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New product</DialogTitle>
        </DialogHeader>
        <CreateProductForm onSuccess={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
