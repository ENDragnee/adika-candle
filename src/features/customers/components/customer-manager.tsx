"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { TableContainer, TableSkeleton } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateCustomer,
  useCustomers,
  useUpdateCustomer,
} from "../hooks/use-customers";
import type { CustomerDTO } from "../validators/customer.schema";

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
      className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3"
    >
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <label htmlFor="new-customer-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="new-customer-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div className="flex min-w-40 flex-1 flex-col gap-1">
        <label htmlFor="new-customer-phone" className="text-sm font-medium">
          Phone
        </label>
        <Input
          id="new-customer-phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </div>
      <div className="flex min-w-40 flex-1 flex-col gap-1">
        <label htmlFor="new-customer-location" className="text-sm font-medium">
          Location
        </label>
        <Input
          id="new-customer-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
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
      <TableRow>
        <TableCell>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </TableCell>
        <TableCell>
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </TableCell>
        <TableCell>
          <Input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </TableCell>
        <TableCell>{customer.loanBalance}</TableCell>
        <TableCell className="text-muted-foreground">
          {customer.isActive ? "Active" : "Inactive"}
        </TableCell>
        <TableCell className="flex gap-2">
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
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>
        <Link
          href={`/manager/customers/${customer.id}`}
          className="underline underline-offset-4"
        >
          {customer.name}
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {customer.phone ?? "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {customer.location ?? "—"}
      </TableCell>
      <TableCell>{customer.loanBalance}</TableCell>
      <TableCell>{customer.isActive ? "Active" : "Inactive"}</TableCell>
      <TableCell className="flex gap-2">
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
      </TableCell>
    </TableRow>
  );
}

export function CustomerManager() {
  const { data: customers, isLoading } = useCustomers();

  return (
    <div className="flex flex-col gap-4">
      <CreateCustomerForm />
      {isLoading ? (
        <TableSkeleton columns={6} />
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="bg-muted/50">Name</TableHead>
                <TableHead className="bg-muted/50">Phone</TableHead>
                <TableHead className="bg-muted/50">Location</TableHead>
                <TableHead className="bg-muted/50">Loan balance</TableHead>
                <TableHead className="bg-muted/50">Status</TableHead>
                <TableHead className="bg-muted/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers?.length ? (
                customers.map((customer) => (
                  <CustomerRow key={customer.id} customer={customer} />
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No customers yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
