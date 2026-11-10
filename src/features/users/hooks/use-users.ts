"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GetErrorMessage } from "@/lib/get-error-message";
import type { PaginationParams } from "@/lib/pagination";
import {
  CreateUser,
  FetchUsers,
  SetUserPassword,
  UpdateUser,
} from "../services/user.service";
import type {
  CreateUserInput,
  SetUserPasswordInput,
  UpdateUserInput,
} from "../validators/user.schema";

export const USERS_QUERY_KEY = ["users"] as const;
export const usersQueryKey = (params: PaginationParams) =>
  ["users", params] as const;

export function useUsers(params: PaginationParams = {}) {
  return useQuery({
    queryKey: usersQueryKey(params),
    queryFn: () => FetchUsers(params),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUserInput) => CreateUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      toast.success("User created");
    },
    onError: (error) => {
      toast.error(GetErrorMessage(error, "Couldn't create user"));
    },
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateUserInput) => UpdateUser(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      toast.success("User updated");
    },
    onError: (error) => {
      toast.error(GetErrorMessage(error, "Couldn't save user"));
    },
  });
}

export function useSetUserPassword(id: string) {
  return useMutation({
    mutationFn: (input: SetUserPasswordInput) => SetUserPassword(id, input),
    onSuccess: () => {
      toast.success("Password updated");
    },
    onError: (error) => {
      toast.error(GetErrorMessage(error, "Couldn't set password"));
    },
  });
}
