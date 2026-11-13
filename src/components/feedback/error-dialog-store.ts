import { create } from "zustand";
import type { ApiErrorInfo } from "@/lib/get-error-message";

export interface ErrorDetails extends ApiErrorInfo {
  title: string;
}

// The one error dialog mounted in the app (ErrorDialog). Toasts open it
// through their "Details" action; anything else can call `show` directly.
interface ErrorDialogState {
  details: ErrorDetails | null;
  show: (details: ErrorDetails) => void;
  close: () => void;
}

export const useErrorDialogStore = create<ErrorDialogState>((set) => ({
  details: null,
  show: (details) => set({ details }),
  close: () => set({ details: null }),
}));
