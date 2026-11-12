import { toast } from "sonner";
import { ParseApiError } from "@/lib/get-error-message";
import { useErrorDialogStore } from "./error-dialog-store";

// Shows a failure the standard way (Epic 22): a toast with the server's
// message, and a "Details" action that opens the error dialog with the
// code and reference id. The toast id is keyed by title + message, so a
// burst of the same failure (several queries losing the network at once)
// shows one toast, not a stack.
export function NotifyError(error: unknown, title: string) {
  const info = ParseApiError(error, title);
  toast.error(title, {
    id: `${title}:${info.message}`,
    description: info.message === title ? undefined : info.message,
    action: {
      label: "Details",
      onClick: () => useErrorDialogStore.getState().show({ title, ...info }),
    },
  });
}
