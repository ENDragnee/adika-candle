"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pluralize } from "@/lib/format";
import {
  FetchSessionSummary,
  FetchSessions,
  RevokeSession,
  RevokeSessions,
} from "../services/session.service";
import type {
  RevokeSessionsInput,
  SessionQuery,
} from "../validators/session.schema";

export const SESSIONS_QUERY_KEY = ["sessions"] as const;

export function useSessions(params: SessionQuery = {}) {
  return useQuery({
    queryKey: [...SESSIONS_QUERY_KEY, params] as const,
    queryFn: () => FetchSessions(params),
  });
}

export function useSessionSummary() {
  return useQuery({
    queryKey: [...SESSIONS_QUERY_KEY, "summary"] as const,
    queryFn: FetchSessionSummary,
    refetchInterval: 60_000,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => RevokeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      toast.success("Signed out of that device");
    },
    meta: { errorTitle: "Couldn't end the session" },
  });
}

export function useRevokeSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RevokeSessionsInput) => RevokeSessions(input),
    onSuccess: ({ revoked }) => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      toast.success(
        revoked === 0
          ? "No other sessions were open"
          : `Ended ${Pluralize(revoked, "session")}`,
      );
    },
    meta: { errorTitle: "Couldn't sign out" },
  });
}
