"use client";

import { MagnifyingGlassIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { type KeyboardEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DescribeLoanBalance } from "@/lib/format";
import { useDebounce } from "@/lib/use-debounce";
import { cn } from "@/lib/utils";
import { useCustomers } from "../hooks/use-customers";
import type { CustomerDTO } from "../validators/customer.schema";
import { CreateCustomerForm } from "./create-customer-form";

const RESULT_LIMIT = 6;

function BalanceLine({ customer }: { customer: CustomerDTO }) {
  const described = DescribeLoanBalance(customer.loanBalance);
  return (
    <span className="text-xs text-muted-foreground">
      {described.direction === "SETTLED"
        ? "Account settled"
        : `${described.label}: ${described.amount}`}
    </span>
  );
}

// Type-to-search customer picker for Record Sale (replaces a long select
// with a "Walk-in" entry). Searches server-side; when nothing matches,
// "Add “…” as a new customer" opens the create form pre-filled.
export function CustomerSearch({
  value,
  onChange,
  disabled = false,
}: {
  value: CustomerDTO | null;
  onChange: (customer: CustomerDTO | null) => void;
  disabled?: boolean;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const search = useDebounce(query.trim(), 250);

  const { data, isFetching } = useCustomers({
    pageSize: RESULT_LIMIT,
    ...(search && { search }),
  });
  const results = (data?.data ?? []).filter((customer) => customer.isActive);
  const canAdd = query.trim().length > 0;
  // Results first, then the "add new" row.
  const optionCount = results.length + (canAdd ? 1 : 0);

  function Pick(customer: CustomerDTO) {
    onChange(customer);
    setQuery("");
    setIsOpen(false);
  }

  function Choose(index: number) {
    if (index < results.length) Pick(results[index]);
    else if (canAdd) setIsCreateOpen(true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setHighlight((index) => Math.min(index + 1, optionCount - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && isOpen && optionCount > 0) {
      // Don't submit the sale form while choosing.
      event.preventDefault();
      Choose(highlight);
    } else if (event.key === "Escape" && isOpen) {
      event.stopPropagation();
      setIsOpen(false);
    }
  }

  const createDialog = (
    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
        </DialogHeader>
        <CreateCustomerForm
          initialName={query.trim()}
          onSuccess={(customer) => {
            setIsCreateOpen(false);
            Pick(customer);
          }}
        />
      </DialogContent>
    </Dialog>
  );

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{value.name}</span>
          <BalanceLine customer={value} />
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Change customer"
          onClick={() => onChange(null)}
          disabled={disabled}
        >
          <XIcon />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id="sale-customer"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Search customers by name…"
        className="pl-8"
        value={query}
        disabled={disabled}
        onChange={(event) => {
          setQuery(event.target.value);
          setHighlight(0);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        // Delay so a click on an option lands before the list closes.
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md"
        >
          {results.map((customer, index) => (
            <button
              key={customer.id}
              type="button"
              role="option"
              aria-selected={index === highlight}
              className={cn(
                "flex w-full flex-col items-start rounded-md px-2.5 py-1.5 text-left",
                index === highlight ? "bg-muted" : "hover:bg-muted/60",
              )}
              onMouseEnter={() => setHighlight(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => Pick(customer)}
            >
              <span className="text-sm">{customer.name}</span>
              <BalanceLine customer={customer} />
            </button>
          ))}
          {results.length === 0 && (isFetching || !canAdd) && (
            <p className="px-2.5 py-2 text-sm text-muted-foreground">
              {isFetching ? "Searching…" : "No customers yet — type a name."}
            </p>
          )}
          {canAdd && (
            <button
              type="button"
              role="option"
              aria-selected={highlight === results.length}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium",
                highlight === results.length ? "bg-muted" : "hover:bg-muted/60",
              )}
              onMouseEnter={() => setHighlight(results.length)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setIsCreateOpen(true)}
            >
              <PlusIcon className="size-4" />
              Add &ldquo;{query.trim()}&rdquo; as a new customer
            </button>
          )}
        </div>
      )}
      {createDialog}
    </div>
  );
}
