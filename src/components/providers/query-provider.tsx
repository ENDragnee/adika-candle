"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorDialog } from "@/components/feedback/error-dialog";
import { NotifyError } from "@/components/feedback/notify-error";

// Per-query/mutation knobs for the global error handling below.
declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: {
      // Toast title when a background refetch fails.
      errorTitle?: string;
    };
    mutationMeta: {
      // Toast title when the mutation fails, e.g. "Couldn't record sale".
      errorTitle?: string;
      // The caller shows the error itself (e.g. the oversell prompt).
      silentError?: boolean;
    };
  }
}

function StatusOf(error: unknown): number | null {
  return isAxiosError(error) ? (error.response?.status ?? null) : null;
}

let redirectingToSignIn = false;

// An expired or revoked session (401) is handled once, globally: one
// toast, then back to sign-in with a return path — instead of every
// widget on the page failing on its own.
function HandleSessionExpired() {
  if (redirectingToSignIn) return;
  redirectingToSignIn = true;
  toast.error("Your session has ended", {
    id: "session-expired",
    description: "Please sign in again.",
  });
  const next = encodeURIComponent(
    window.location.pathname + window.location.search,
  );
  window.location.assign(`/auth/sign-in?next=${next}`);
}

// Central error handling (Epic 22). Before, each of ~27 mutation hooks
// hand-wrote its own error toast and failed queries left a skeleton up
// forever.
// - Mutations: a toast titled by `meta.errorTitle` with a "Details" action
//   (error dialog with code + reference id), unless `meta.silentError`.
// - Queries: a first load that fails throws to the route's error page
//   (retry / go back); a failed *background* refetch keeps the data on
//   screen and only toasts.
// - 401 anywhere: one "session ended" toast and a redirect to sign-in.
// - Client errors (4xx) are never retried — retrying a 403 or 404 only
//   delays the message.
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (StatusOf(error) === 401) return HandleSessionExpired();
            if (query.state.data !== undefined) {
              NotifyError(
                error,
                query.meta?.errorTitle ?? "Couldn't refresh this page",
              );
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            if (StatusOf(error) === 401) return HandleSessionExpired();
            if (mutation.meta?.silentError) return;
            NotifyError(error, mutation.meta?.errorTitle ?? "That didn't work");
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              const status = StatusOf(error);
              if (status !== null && status >= 400 && status < 500) {
                return false;
              }
              return failureCount < 2;
            },
            throwOnError: (error, query) =>
              StatusOf(error) !== 401 && query.state.data === undefined,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ErrorDialog />
    </QueryClientProvider>
  );
}
