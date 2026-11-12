"use client";

import {
  CalendarBlankIcon,
  CaretDownIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BusinessDateKey } from "@/lib/business-time";
import {
  DATE_RANGE_LABELS,
  type DateRangePreset,
  type DateRangeValue,
  MAX_RANGE_DAYS,
  ResolveDateRange,
  ValidateCustomRange,
} from "@/lib/date-range";
import { FormatDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";

function DescribeCustom(value: DateRangeValue): string {
  if (!value.from || !value.to) return DATE_RANGE_LABELS.custom;
  if (value.from === value.to)
    return FormatDateKey(value.from, { short: false });
  return `${FormatDateKey(value.from)} – ${FormatDateKey(value.to, { short: false })}`;
}

// One date-range control for every filterable view (Epic 22): quick
// presets, plus a custom from/to that's validated before it's applied
// (start ≤ end, not in the future, at most `maxDays` long). Dates are
// business-local calendar days, matching the API's `from`/`to`.
export function DateRangeFilter({
  value,
  onChange,
  presets = ["today", "7d", "30d", "month", "last-month", "90d", "all"],
  maxDays = MAX_RANGE_DAYS,
  className,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  presets?: Exclude<DateRangePreset, "custom">[];
  // null = no limit (e.g. browsing the full sales history).
  maxDays?: number | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const resolved = ResolveDateRange(value);
  const [from, setFrom] = useState(resolved.from ?? "");
  const [to, setTo] = useState(resolved.to ?? "");
  const today = BusinessDateKey(new Date());
  const error = ValidateCustomRange({ from, to }, maxDays, today);

  const label =
    value.preset === "custom"
      ? DescribeCustom(value)
      : DATE_RANGE_LABELS[value.preset];

  function Choose(preset: Exclude<DateRangePreset, "custom">) {
    onChange({ preset });
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          // Start the custom fields from whatever range is showing now.
          const current = ResolveDateRange(value);
          setFrom(current.from ?? "");
          setTo(current.to ?? today);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-between gap-2 font-normal", className)}
          aria-label={`Date range: ${label}`}
        >
          <span className="flex items-center gap-2 truncate">
            <CalendarBlankIcon className="size-4 text-muted-foreground" />
            {label}
          </span>
          <CaretDownIcon className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="grid grid-cols-2 gap-1 p-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => Choose(preset)}
              className={cn(
                "flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted",
                value.preset === preset && "bg-muted font-medium",
              )}
            >
              {DATE_RANGE_LABELS[preset]}
              {value.preset === preset && <CheckIcon className="size-3.5" />}
            </button>
          ))}
        </div>
        <form
          className="flex flex-col gap-2 border-t border-border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (error) return;
            onChange({ preset: "custom", from, to });
            setOpen(false);
          }}
        >
          <span className="text-xs font-medium text-muted-foreground">
            Custom range
          </span>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs">
              From
              <Input
                type="date"
                value={from}
                max={to || today}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              To
              <Input
                type="date"
                value={to}
                min={from || undefined}
                max={today}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
          </div>
          {error && (from || to) && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" size="sm" disabled={Boolean(error)}>
            Apply range
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
