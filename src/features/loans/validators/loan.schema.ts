import { z } from "zod";
import type {
  Customer,
  LoanAccount,
  LoanTransaction,
} from "@/generated/prisma/client";

export const LoanTransactionTypeSchema = z.enum([
  "SALE_ON_CREDIT",
  "REPAYMENT_RECEIVED",
  "ADVANCE_FROM_CUSTOMER",
  "ADVANCE_REDEEMED",
  "MANUAL_ADJUSTMENT",
  "SALE_VOID",
]);

export const LoanTransactionSchema = z.object({
  id: z.string(),
  loanAccountId: z.string(),
  type: LoanTransactionTypeSchema,
  amount: z.string(),
  balanceAfter: z.string(),
  note: z.string().nullable(),
  saleId: z.string().nullable(),
  createdById: z.string(),
  createdAt: z.iso.datetime(),
});

export type LoanTransactionDTO = z.infer<typeof LoanTransactionSchema>;

export const LoanTransactionListResponseSchema = z.array(LoanTransactionSchema);

export function ToLoanTransactionDTO(
  transaction: LoanTransaction,
): LoanTransactionDTO {
  return {
    id: transaction.id,
    loanAccountId: transaction.loanAccountId,
    type: transaction.type,
    amount: transaction.amount.toString(),
    balanceAfter: transaction.balanceAfter.toString(),
    note: transaction.note,
    saleId: transaction.saleId,
    createdById: transaction.createdById,
    createdAt: transaction.createdAt.toISOString(),
  };
}

export const LoanAccountSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  customerIsActive: z.boolean(),
  balance: z.string(),
  // Most recent REPAYMENT_RECEIVED; null if they've never paid.
  lastPaymentAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime(),
});

export type LoanAccountDTO = z.infer<typeof LoanAccountSchema>;

export const LoanAccountListResponseSchema = z.array(LoanAccountSchema);

type LoanAccountWithCustomer = LoanAccount & { customer: Customer };

export function ToLoanAccountDTO(
  account: LoanAccountWithCustomer,
  lastPaymentAt: Date | null = null,
): LoanAccountDTO {
  return {
    id: account.id,
    customerId: account.customerId,
    customerName: account.customer.name,
    customerIsActive: account.customer.isActive,
    balance: account.balance.toString(),
    lastPaymentAt: lastPaymentAt?.toISOString() ?? null,
    updatedAt: account.updatedAt.toISOString(),
  };
}

// Receivables filter (Epic 21): OWES = customer owes us (balance > 0),
// CREDIT = we owe the customer (balance < 0), SETTLED = 0.
export const LoanBalanceFilterSchema = z.enum([
  "ALL",
  "OWES",
  "CREDIT",
  "SETTLED",
]);
export type LoanBalanceFilter = z.infer<typeof LoanBalanceFilterSchema>;

export const LoanAccountQuerySchema = z.object({
  balance: LoanBalanceFilterSchema.default("ALL"),
  search: z.string().trim().min(1).optional(),
});
export type LoanAccountQuery = z.input<typeof LoanAccountQuerySchema>;

export const ReceivablesSummarySchema = z.object({
  owedToUs: z.string(),
  customerCredit: z.string(),
  debtorCount: z.number().int(),
  creditCount: z.number().int(),
});
export type ReceivablesSummaryDTO = z.infer<typeof ReceivablesSummarySchema>;

// REPAYMENT_RECEIVED and ADVANCE_FROM_CUSTOMER both always decrease the
// balance (less owed to the business, or more owed by the business) — the
// direction is implied by the type, per the LoanTransaction model's
// "amount: positive magnitude; direction implied by type" comment.
// MANUAL_ADJUSTMENT is a free-form correction with no implied direction,
// so it alone carries an explicit `direction` field. See
// docs/DECISIONS.md.
export const CreateLoanTransactionInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.enum(["REPAYMENT_RECEIVED", "ADVANCE_FROM_CUSTOMER"]),
    amount: z.coerce.number().positive().finite(),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    type: z.literal("MANUAL_ADJUSTMENT"),
    amount: z.coerce.number().positive().finite(),
    direction: z.enum(["INCREASE", "DECREASE"]),
    note: z.string().trim().max(500).optional(),
  }),
]);

export type CreateLoanTransactionInput = z.infer<
  typeof CreateLoanTransactionInputSchema
>;
