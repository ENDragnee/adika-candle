"use client";

import {
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  PencilSimpleIcon,
  PlusIcon,
  ProhibitIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { TableContainer, TableSkeleton } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
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

function CreateCustomerForm({ onSuccess }: { onSuccess: () => void }) {
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
    onSuccess();
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
      <Button type="submit" disabled={createCustomer.isPending}>
        {createCustomer.isPending ? "Adding…" : "Add customer"}
      </Button>
    </form>
  );
}

function EditCustomerForm({
  customer,
  onSuccess,
}: {
  customer: CustomerDTO;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [location, setLocation] = useState(customer.location ?? "");
  const updateCustomer = useUpdateCustomer(customer.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await updateCustomer.mutateAsync({
      name,
      phone: phone || undefined,
      location: location || undefined,
    });
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-customer-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="edit-customer-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-customer-phone" className="text-sm font-medium">
          Phone
        </label>
        <Input
          id="edit-customer-phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-customer-location" className="text-sm font-medium">
          Location
        </label>
        <Input
          id="edit-customer-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={updateCustomer.isPending}>
        {updateCustomer.isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

function CustomerRow({ customer }: { customer: CustomerDTO }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const updateCustomer = useUpdateCustomer(customer.id);

  async function handleActivate() {
    await updateCustomer.mutateAsync({ isActive: true });
  }

  async function handleConfirmDeactivate() {
    await updateCustomer.mutateAsync({ isActive: false });
    setIsConfirmOpen(false);
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
      <TableCell>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Actions">
                  <DotsThreeVerticalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
                  <PencilSimpleIcon />
                  Edit
                </DropdownMenuItem>
                {customer.isActive ? (
                  <DropdownMenuItem
                    onSelect={() => setIsConfirmOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <ProhibitIcon />
                    Deactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={handleActivate}>
                    <CheckCircleIcon />
                    Activate
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate customer?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{customer.name}&rdquo; will no longer be available when
                  recording sales or loan activity.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeactivate}>
                  Deactivate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit customer</DialogTitle>
            </DialogHeader>
            <EditCustomerForm
              customer={customer}
              onSuccess={() => setIsEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}

export function CustomerManager() {
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: result, isLoading } = useCustomers({ page });
  const customers = result?.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
            <CreateCustomerForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <TableSkeleton columns={6} mobileCard={false} />
      ) : (
        <>
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
          <Pagination
            page={page}
            totalPages={result?.pagination.totalPages ?? 1}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
