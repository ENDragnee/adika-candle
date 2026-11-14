"use client";

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FormatDate, Pluralize } from "@/lib/format";
import {
  useLogPurgePreview,
  usePurgeLogs,
  useUpdateSystemSettings,
} from "../hooks/use-system";
import type { SystemSettings } from "../validators/system.schema";
import { InRange, NumberSetting, SettingCard } from "./setting-card";

// Activity-log retention (Epic 24): how long entries are kept, and a
// purge an Admin runs by hand (no automatic deletion).
export function RetentionCard({
  settings,
}: {
  settings: SystemSettings["retention"];
}) {
  const [days, setDays] = useState(String(settings.logRetentionDays));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const update = useUpdateSystemSettings("Retention saved");
  const { data: preview, isLoading } = useLogPurgePreview();
  const purge = usePurgeLogs();
  const valid = InRange(days, 90, 3650);
  const dirty = Number(days) !== settings.logRetentionDays;

  return (
    <SettingCard
      icon={ClockCounterClockwiseIcon}
      title="Activity log retention"
      description="How long the activity log keeps entries. Older ones are removed only when you purge."
    >
      <div className="flex flex-wrap items-end gap-3">
        <NumberSetting
          id="retention-days"
          label="Keep entries for"
          value={days}
          onChange={setDays}
          min={90}
          max={3650}
          suffix="days"
          hint="90–3650 (10 years)"
        />
        <Button
          size="sm"
          className="mb-5"
          loading={update.isPending}
          disabled={!valid || !dirty}
          onClick={() =>
            update.mutate({ retention: { logRetentionDays: Number(days) } })
          }
        >
          Save
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3 text-sm">
        {isLoading || !preview ? (
          <Skeleton className="h-4 w-56" />
        ) : (
          <span>
            {Pluralize(preview.total, "entry", "entries")} in the log
            {preview.oldestAt && `, oldest ${FormatDate(preview.oldestAt)}`}.{" "}
            <span className="font-medium">
              {preview.purgeable === 0
                ? "Nothing is older than the retention window."
                : `${Pluralize(preview.purgeable, "entry", "entries")} older than ${FormatDate(preview.cutoff)} can be removed.`}
            </span>
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={!preview || preview.purgeable === 0}
          onClick={() => setConfirmOpen(true)}
        >
          Purge now…
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove{" "}
              {preview
                ? Pluralize(preview.purgeable, "entry", "entries")
                : "old entries"}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Activity older than{" "}
              {preview ? FormatDate(preview.cutoff) : "the retention window"} is
              permanently deleted. This can't be undone — download a backup with
              the activity log first if you may need it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              loading={purge.isPending}
              onClick={async () => {
                await purge.mutateAsync();
                setConfirmOpen(false);
              }}
            >
              Delete permanently
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingCard>
  );
}
