import { z } from "zod";
import type { Customer, LoanAccount } from "@/generated/prisma/client";

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  isActive: z.boolean(),
  loanAccountId: z.string(),
  loanBalance: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type CustomerDTO = z.infer<typeof CustomerSchema>;

export const CustomerListResponseSchema = z.array(CustomerSchema);

export const CreateCustomerInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  phone: z.string().trim().max(40).optional(),
  location: z.string().trim().max(120).optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerInputSchema>;

export const UpdateCustomerInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  location: z.string().trim().max(120).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateCustomerInput = z.infer<typeof UpdateCustomerInputSchema>;

type CustomerWithLoanAccount = Customer & { loanAccount: LoanAccount | null };

// loanAccount is never actually null in practice — POST /api/v1/customers
// creates it in the same transaction as the Customer row (see
// docs/DECISIONS.md, "Customer always gets a LoanAccount at creation
// time") — but the relation is still optional in the schema, so this stays
// defensive rather than asserting non-null.
export function ToCustomerDTO(customer: CustomerWithLoanAccount): CustomerDTO {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    location: customer.location,
    isActive: customer.isActive,
    loanAccountId: customer.loanAccount?.id ?? "",
    loanBalance: (customer.loanAccount?.balance ?? 0).toString(),
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

export const WITH_LOAN_ACCOUNT_INCLUDE = {
  loanAccount: true,
} as const;
