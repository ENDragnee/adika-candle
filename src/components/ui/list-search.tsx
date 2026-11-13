"use client";

import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/lib/use-debounce";
import { cn } from "@/lib/utils";

// Search box for server-searched lists (Epic 21): types freely, reports
// the trimmed value after a short pause so each keystroke isn't a request.
export function ListSearch({
  placeholder,
  onSearch,
  className,
}: {
  placeholder: string;
  onSearch: (value: string | undefined) => void;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const debounced = useDebounce(value.trim(), 300);

  useEffect(() => {
    onSearch(debounced || undefined);
  }, [debounced, onSearch]);

  return (
    <div className={cn("relative", className)}>
      <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="w-full pr-8 pl-8"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <XIcon className="size-3.5" />
        </button>
      )}
    </div>
  );
}
