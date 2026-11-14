"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FetchSystemSettings,
  UpdateSystemSettings,
} from "../services/system.service";
import type { UpdateSystemSettingsInput } from "../validators/system.schema";

export const SYSTEM_QUERY_KEY = ["system"] as const;

export function useSystemSettings() {
  return useQuery({
    queryKey: [...SYSTEM_QUERY_KEY, "settings"] as const,
    queryFn: FetchSystemSettings,
  });
}

export function useUpdateSystemSettings(
  successMessage = "Settings saved",
  onSaved?: () => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSystemSettingsInput) =>
      UpdateSystemSettings(input),
    onSuccess: (settings) => {
      queryClient.setQueryData([...SYSTEM_QUERY_KEY, "settings"], settings);
      queryClient.invalidateQueries({ queryKey: SYSTEM_QUERY_KEY });
      toast.success(successMessage);
      onSaved?.();
    },
    meta: { errorTitle: "Couldn't save settings" },
  });
}
