"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateCustomer } from "../hooks/use-customers";
import type { CustomerDTO } from "../validators/customer.schema";

// Shared by the Manager's customer list, the Inventory Manager's customer
// list and the Record Sale customer search ("Add “…” as a customer").
export function CreateCustomerForm({
  initialName = "",
  onSuccess,
}: {
  initialName?: string;
  onSuccess: (customer: CustomerDTO) => void;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const createCustomer = useCreateCustomer();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Rendered in a portal inside the Record Sale form: React still
    // bubbles the submit up the component tree, which would submit the
    // sale too.
    event.stopPropagation();

    const customer = await createCustomer.mutateAsync({
      name,
      phone: phone || undefined,
      location: location || undefined,
    });

    setName("");
    setPhone("");
    setLocation("");
    onSuccess(customer);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="new-customer-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="new-customer-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="new-customer-phone" className="text-sm font-medium">
          Phone
        </label>
        <Input
          id="new-customer-phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="new-customer-location" className="text-sm font-medium">
          Location
        </label>
        <Input
          id="new-customer-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />
      </div>
      <Button
        loading={createCustomer.isPending}
        type="submit"
        disabled={createCustomer.isPending}
      >
        {createCustomer.isPending ? "Adding…" : "Add customer"}
      </Button>
    </form>
  );
}

export function AddCustomerDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon data-icon="inline-start" />
          Add customer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
        </DialogHeader>
        <CreateCustomerForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
