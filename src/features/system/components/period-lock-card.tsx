"use client";

import { LockIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ToneBadge } from "@/components/ui/tone-badge";
import {
  AddBusinessDays,
  BusinessDateKey,
  StartOfBusinessDay,
  StartOfBusinessMonth,
} from "@/lib/business-time";
import { FormatDateKey } from "@/lib/format";
import { useUpdateSystemSettings } from "../hooks/use-system";
import type { SystemSettings } from "../validators/system.schema";
import { SettingCard } from "./setting-card";

function Yesterday(): string {
  return BusinessDateKey(AddBusinessDays(StartOfBusinessDay(new Date()), -1));
}

function EndOfLastMonth(): string {
  return BusinessDateKey(AddBusinessDays(StartOfBusinessMonth(new Date()), -1));
}

// Closing the books (Epic 24): sales dated on or before the lock date
// can't be voided or restored, so reports for closed periods stay fixed.
export function PeriodLockCard({
  settings,
}: {
  settings: SystemSettings["periodLock"];
}) {
  const [date, setDate] = useState(settings.lockedThrough ?? EndOfLastMonth());
  const update = useUpdateSystemSettings("Closed periods updated");
  const max = Yesterday();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= max;

  return (
    <SettingCard
      icon={LockIcon}
      title="Closed periods"
      description="Sales on or before the lock date can't be voided or restored, so past reports stay as they are."
      status={
        settings.lockedThrough ? (
          <ToneBadge tone="info">
            Closed through {FormatDateKey(settings.lockedThrough)}
          </ToneBadge>
        ) : (
          <ToneBadge tone="neutral">Nothing closed</ToneBadge>
        )
      }
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="locked-through" className="text-sm font-medium">
          Close the books through
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="locked-through"
            type="date"
            value={date}
            max={max}
            onChange={(event) => setDate(event.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setDate(EndOfLastMonth())}
          >
            End of last month
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Up to yesterday. Dates are in Addis Ababa time.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          loading={update.isPending}
          disabled={!valid || date === settings.lockedThrough}
          onClick={() => update.mutate({ periodLock: { lockedThrough: date } })}
        >
          {settings.lockedThrough ? "Move lock date" : "Close the books"}
        </Button>
        {settings.lockedThrough && (
          <Button
            size="sm"
            variant="outline"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({ periodLock: { lockedThrough: null } })
            }
          >
            Reopen all periods
          </Button>
        )}
      </div>
    </SettingCard>
  );
}
