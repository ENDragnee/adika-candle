"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GetErrorMessage } from "@/lib/get-error-message";
import type { PaginationParams } from "@/lib/pagination";
import {
  CreateCategory,
  DeactivateCategory,
  FetchCategories,
  UpdateCategory,
} from "../services/category.service";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../validators/category.schema";

export const CATEGORIES_QUERY_KEY = ["categories"] as const;
export const categoriesQueryKey = (params: PaginationParams) =>
  ["categories", params] as const;

export function useCategories(params: PaginationParams = {}) {
  return useQuery({
    queryKey: categoriesQueryKey(params),
    queryFn: () => FetchCategories(params),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput) => CreateCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      toast.success("Category added");
    },
    onError: (error) => {
      toast.error(GetErrorMessage(error, "Couldn't add category"));
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      UpdateCategory(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      toast.success("Category updated");
    },
    onError: (error) => {
      toast.error(GetErrorMessage(error, "Couldn't save category"));
    },
  });
}

export function useDeactivateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => DeactivateCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      toast.success("Category deactivated");
    },
    onError: (error) => {
      toast.error(GetErrorMessage(error, "Couldn't deactivate category"));
    },
  });
}
