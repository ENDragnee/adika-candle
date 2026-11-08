"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaginationParams } from "@/lib/pagination";
import { CreateUser, FetchUsers, UpdateUser } from "../services/user.service";
import type {
  CreateUserInput,
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateUserInput) => UpdateUser(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });
}
