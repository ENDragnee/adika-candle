"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreateUser, FetchUsers, UpdateUser } from "../services/user.service";
import type {
  CreateUserInput,
  UpdateUserInput,
} from "../validators/user.schema";

export const USERS_QUERY_KEY = ["users"] as const;

export function useUsers() {
  return useQuery({ queryKey: USERS_QUERY_KEY, queryFn: FetchUsers });
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
