"use client";

import type { Icon } from "@phosphor-icons/react";
import type * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// One Admin control on the System page (Epic 24).
export function SettingCard({
  icon: IconComponent,
  title,
  description,
  status,
  children,
  className,
}: {
  icon: Icon;
  title: string;
  description: React.ReactNode;
  status?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("h-full", className)}>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <IconComponent className="size-4.5 text-muted-foreground" />
            </span>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          {status}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function NumberSetting({
  id,
  label,
  hint,
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  suffix: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-24 rounded-md border border-input bg-transparent px-3 text-sm tabular-nums shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function InRange(value: string, min: number, max: number): boolean {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max;
}
