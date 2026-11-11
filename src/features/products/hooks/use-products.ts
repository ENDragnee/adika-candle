"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GetErrorMessage } from "@/lib/get-error-message";
import type { PaginationParams } from "@/lib/pagination";
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
export const productsQueryKey = (params: PaginationParams) =>
  ["products", params] as const;
export const productQueryKey = (id: string) => ["products", id] as const;

export function useProducts(params: PaginationParams = {}) {
  return useQuery({
    queryKey: productsQueryKey(params),
    queryFn: () => FetchProducts(params),
  });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      toast.success("Product added");
    },
    onError: (error) => {
      toast.error(GetErrorMessage(error, "Couldn't add product"));
    },
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProductInput) => UpdateProduct(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: productQueryKey(id) });
      toast.success("Product updated");
    },
    onError: (error) => {
      toast.error(GetErrorMessage(error, "Couldn't save product"));
    },
  });
}
