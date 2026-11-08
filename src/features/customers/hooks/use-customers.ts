"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateCustomer,
  FetchCustomer,
  FetchCustomers,
  UpdateCustomer,
} from "../services/customer.service";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "../validators/customer.schema";

export const CUSTOMERS_QUERY_KEY = ["customers"] as const;
export const customerQueryKey = (id: string) => ["customers", id] as const;

export function useCustomers() {
  return useQuery({ queryKey: CUSTOMERS_QUERY_KEY, queryFn: FetchCustomers });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerQueryKey(id),
    queryFn: () => FetchCustomer(id),
    enabled: Boolean(id),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCustomerInput) => CreateCustomer(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY }),
  });
}

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCustomerInput) => UpdateCustomer(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: customerQueryKey(id) });
    },
  });
}
