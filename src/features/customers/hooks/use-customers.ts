"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CreateCustomer,
  type CustomersQueryParams,
  FetchCustomer,
  FetchCustomers,
  UpdateCustomer,
} from "../services/customer.service";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "../validators/customer.schema";

export const CUSTOMERS_QUERY_KEY = ["customers"] as const;
export const customersQueryKey = (params: CustomersQueryParams) =>
  ["customers", params] as const;
export const customerQueryKey = (id: string) => ["customers", id] as const;

export function useCustomers(params: CustomersQueryParams = {}) {
  return useQuery({
    queryKey: customersQueryKey(params),
    queryFn: () => FetchCustomers(params),
  });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      toast.success("Customer added");
    },
    meta: { errorTitle: "Couldn't add customer" },
  });
}

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCustomerInput) => UpdateCustomer(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: customerQueryKey(id) });
      toast.success("Customer updated");
    },
    meta: { errorTitle: "Couldn't save customer" },
  });
}
