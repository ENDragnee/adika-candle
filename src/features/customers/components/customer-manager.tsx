"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useCreateCustomer,
  useCustomers,
  useUpdateCustomer,
} from "../hooks/use-customers";
import type { CustomerDTO } from "../validators/customer.schema";

const inputClassName =
  "h-8 w-full rounded-none border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

function CreateCustomerForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const createCustomer = useCreateCustomer();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await createCustomer.mutateAsync({
      name,
      phone: phone || undefined,
      location: location || undefined,
    });

    setName("");
    setPhone("");
    setLocation("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 border border-border p-3"
    >
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <label htmlFor="new-customer-name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="new-customer-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className={inputClassName}
        />
      </div>
      <div className="flex min-w-40 flex-1 flex-col gap-1">
        <label htmlFor="new-customer-phone" className="text-sm font-medium">
          Phone
        </label>
        <input
          id="new-customer-phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="flex min-w-40 flex-1 flex-col gap-1">
        <label htmlFor="new-customer-location" className="text-sm font-medium">
          Location
        </label>
        <input
          id="new-customer-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className={inputClassName}
        />
      </div>
      <Button type="submit" disabled={createCustomer.isPending}>
        {createCustomer.isPending ? "Adding…" : "Add customer"}
      </Button>
      {createCustomer.isError && (
        <p className="w-full text-sm text-destructive">
          Couldn&apos;t create customer.
        </p>
      )}
    </form>
  );
}

function CustomerRow({ customer }: { customer: CustomerDTO }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [location, setLocation] = useState(customer.location ?? "");
  const updateCustomer = useUpdateCustomer(customer.id);

  async function handleSave() {
    await updateCustomer.mutateAsync({
      name,
      phone: phone || undefined,
      location: location || undefined,
    });
    setIsEditing(false);
  }

  function handleCancel() {
    setName(customer.name);
    setPhone(customer.phone ?? "");
    setLocation(customer.location ?? "");
    setIsEditing(false);
  }

  async function handleToggleActive() {
    await updateCustomer.mutateAsync({ isActive: !customer.isActive });
  }

  if (isEditing) {
    return (
      <tr className="border-b border-border">
        <td className="p-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClassName}
          />
        </td>
        <td className="p-2">
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClassName}
          />
        </td>
        <td className="p-2">
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className={inputClassName}
          />
        </td>
        <td className="p-2 text-sm">{customer.loanBalance}</td>
        <td className="p-2 text-sm text-muted-foreground">
          {customer.isActive ? "Active" : "Inactive"}
        </td>
        <td className="flex gap-2 p-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateCustomer.isPending}
          >
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border">
      <td className="p-2 text-sm">
        <Link
          href={`/manager/customers/${customer.id}`}
          className="underline underline-offset-4"
        >
          {customer.name}
        </Link>
      </td>
      <td className="p-2 text-sm text-muted-foreground">
        {customer.phone ?? "—"}
      </td>
      <td className="p-2 text-sm text-muted-foreground">
        {customer.location ?? "—"}
      </td>
      <td className="p-2 text-sm">{customer.loanBalance}</td>
      <td className="p-2 text-sm">
        {customer.isActive ? "Active" : "Inactive"}
      </td>
      <td className="flex gap-2 p-2">
        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
          Edit
        </Button>
        <Button
          size="sm"
          variant={customer.isActive ? "destructive" : "secondary"}
          onClick={handleToggleActive}
          disabled={updateCustomer.isPending}
        >
          {customer.isActive ? "Deactivate" : "Activate"}
        </Button>
      </td>
    </tr>
  );
}

export function CustomerManager() {
  const { data: customers, isLoading } = useCustomers();

  return (
    <div className="flex flex-col gap-4">
      <CreateCustomerForm />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading customers…</p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-2 text-sm font-medium">Name</th>
                <th className="p-2 text-sm font-medium">Phone</th>
                <th className="p-2 text-sm font-medium">Location</th>
                <th className="p-2 text-sm font-medium">Loan balance</th>
                <th className="p-2 text-sm font-medium">Status</th>
                <th className="p-2 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers?.length ? (
                customers.map((customer) => (
                  <CustomerRow key={customer.id} customer={customer} />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="p-3 text-center text-sm text-muted-foreground"
                  >
                    No customers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
