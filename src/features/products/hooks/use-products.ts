"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateProduct,
  FetchProduct,
  FetchProducts,
  UpdateProduct,
} from "../services/product.service";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "../validators/product.schema";

export const PRODUCTS_QUERY_KEY = ["products"] as const;
export const productQueryKey = (id: string) => ["products", id] as const;

export function useProducts() {
  return useQuery({ queryKey: PRODUCTS_QUERY_KEY, queryFn: FetchProducts });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productQueryKey(id),
    queryFn: () => FetchProduct(id),
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductInput) => CreateProduct(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY }),
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProductInput) => UpdateProduct(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: productQueryKey(id) });
    },
  });
}
