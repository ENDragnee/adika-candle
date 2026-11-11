"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GetErrorMessage } from "@/lib/get-error-message";
import { FetchRoles, UpdateRolePermissions } from "../services/role.service";

export const ROLES_QUERY_KEY = ["roles"] as const;

export function useRoles() {
  return useQuery({ queryKey: ROLES_QUERY_KEY, queryFn: FetchRoles });
}

export function useUpdateRolePermissions(roleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (permissionIds: string[]) =>
      UpdateRolePermissions(roleId, permissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      toast.success("Permissions updated");
    },
    onError: (error) => {
      toast.error(GetErrorMessage(error, "Couldn't save permissions"));
    },
  });
}
