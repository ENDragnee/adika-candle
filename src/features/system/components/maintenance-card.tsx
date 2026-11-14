"use client";

import { WrenchIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import { ToneBadge } from "@/components/ui/tone-badge";
import { FormatRelative } from "@/lib/format";
import { useUpdateSystemSettings } from "../hooks/use-system";
import type { SystemSettings } from "../validators/system.schema";
import { SettingCard } from "./setting-card";

// Maintenance mode (Epic 24): everyone without system:manage is refused
// at sign-in and sent to /maintenance; optionally their open sessions end
// right away.
export function MaintenanceCard({
  settings,
}: {
  settings: SystemSettings["maintenance"];
}) {
  const [message, setMessage] = useState(settings.message);
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();
  // The banner comes from the (server) dashboard layout — refresh it.
  const update = useUpdateSystemSettings(
    settings.enabled ? "Maintenance mode is off" : "Maintenance mode is on",
    () => router.refresh(),
  );
  const messageValid = message.trim().length > 0 && message.length <= 300;

  return (
    <SettingCard
      icon={WrenchIcon}
      title="Maintenance mode"
      description="Close the system to everyone except administrators, e.g. while fixing data."
      status={
        settings.enabled ? (
          <ToneBadge tone="warning">
            On
            {settings.startedAt
              ? ` · ${FormatRelative(settings.startedAt)}`
              : ""}
          </ToneBadge>
        ) : (
          <ToneBadge tone="neutral">Off</ToneBadge>
        )
      }
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="maintenance-message" className="text-sm font-medium">
          Message people see
        </label>
        <textarea
          id="maintenance-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={300}
          rows={2}
          className="min-h-16 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {settings.enabled ? (
          <>
            <Button
              size="sm"
              loading={update.isPending}
              onClick={() => update.mutate({ maintenance: { enabled: false } })}
            >
              Turn off
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!messageValid || message === settings.message}
              onClick={() => update.mutate({ maintenance: { message } })}
            >
              Update message
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            disabled={!messageValid}
            onClick={() => setConfirmOpen(true)}
          >
            Turn on…
          </Button>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn on maintenance mode?</AlertDialogTitle>
            <AlertDialogDescription>
              Nobody except administrators can sign in or use the system until
              you turn it off. Sales and stock can't be recorded meanwhile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label
            htmlFor="maintenance-sign-out"
            className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"
          >
            <Switch
              id="maintenance-sign-out"
              checked={signOutOthers}
              onCheckedChange={setSignOutOthers}
              aria-label="Sign everyone else out now"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">Sign everyone else out now</span>
              <span className="text-xs text-muted-foreground">
                Otherwise their open pages stop working on their next click.
              </span>
            </span>
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              loading={update.isPending}
              onClick={async () => {
                await update.mutateAsync({
                  maintenance: { enabled: true, message, signOutOthers },
                });
                setConfirmOpen(false);
              }}
            >
              Turn on
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingCard>
  );
}
