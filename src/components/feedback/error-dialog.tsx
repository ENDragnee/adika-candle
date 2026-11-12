"use client";

import { CopyIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useErrorDialogStore } from "./error-dialog-store";

const CODE_HINTS: Record<string, string> = {
  NETWORK: "Your device couldn't reach the server.",
  FORBIDDEN:
    "Your role doesn't include this. A Manager can change that under Roles.",
  INTERNAL:
    "This is a problem on our side, not something you did. If it keeps happening, share the reference below.",
};

// Details for a failed action (Epic 22): what went wrong in plain words,
// a hint for common causes, and a reference id (the request id) to quote
// when reporting it — with a copy button.
export function ErrorDialog() {
  const details = useErrorDialogStore((state) => state.details);
  const close = useErrorDialogStore((state) => state.close);

  async function CopyReport() {
    if (!details) return;
    const report = [
      details.title,
      details.message,
      details.code && `Code: ${details.code}`,
      details.status && `Status: ${details.status}`,
      details.requestId && `Reference: ${details.requestId}`,
      `Page: ${window.location.pathname}`,
      `Time: ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(report);
      toast.success("Error details copied");
    } catch {
      toast.error("Couldn't copy — select the text instead");
    }
  }

  return (
    <AlertDialog
      open={details !== null}
      onOpenChange={(open) => !open && close()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <WarningCircleIcon
              weight="fill"
              className="size-5"
              style={{ color: "var(--color-status-critical)" }}
            />
            {details?.title}
          </AlertDialogTitle>
          <AlertDialogDescription>{details?.message}</AlertDialogDescription>
        </AlertDialogHeader>
        {details?.code && CODE_HINTS[details.code] && (
          <p className="text-sm text-muted-foreground">
            {CODE_HINTS[details.code]}
          </p>
        )}
        {details?.requestId && (
          <div className="flex flex-col rounded-lg bg-muted/60 px-3 py-2">
            <span className="text-xs text-muted-foreground">Reference</span>
            <code className="truncate text-xs">{details.requestId}</code>
          </div>
        )}
        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={CopyReport}>
            <CopyIcon data-icon="inline-start" />
            Copy details
          </Button>
          <AlertDialogAction onClick={close}>Close</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
