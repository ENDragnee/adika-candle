"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CreateRole,
  DeleteRole,
  FetchRoles,
  UpdateRole,
  UpdateRolePermissions,
} from "../services/role.service";
import type {
  CreateRoleInput,
  UpdateRoleInput,
} from "../validators/role.schema";

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
    meta: { errorTitle: "Couldn't save permissions" },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => CreateRole(input),
    onSuccess: (role) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      toast.success(`Role "${role.name}" created`);
    },
    meta: { errorTitle: "Couldn't create the role" },
  });
}

export function useUpdateRole(roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRoleInput) => UpdateRole(roleId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      toast.success("Role updated");
    },
    meta: { errorTitle: "Couldn't update the role" },
  });
}

export function useDeleteRole(roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => DeleteRole(roleId),
    onSuccess: (role) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      toast.success(`Role "${role.name}" deleted`);
    },
    meta: { errorTitle: "Couldn't delete the role" },
  });
}
