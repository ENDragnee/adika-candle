import type { Tone } from "@/components/ui/tone-badge";

// Plain-language names for LoanTransactionType (Epic 21), with what each
// one does to the balance, spelled out for the Legend and tooltips.
export const LOAN_TRANSACTION_META: Record<
  | "SALE_ON_CREDIT"
  | "REPAYMENT_RECEIVED"
  | "ADVANCE_FROM_CUSTOMER"
  | "ADVANCE_REDEEMED"
  | "MANUAL_ADJUSTMENT"
  | "SALE_VOID",
  { label: string; tone: Tone; description: string }
> = {
  SALE_ON_CREDIT: {
    label: "Sale on account",
    tone: "warning",
    description: "A sale the customer will pay for later. They owe more.",
  },
  REPAYMENT_RECEIVED: {
    label: "Payment received",
    tone: "good",
    description: "The customer paid money toward what they owe.",
  },
  ADVANCE_FROM_CUSTOMER: {
    label: "Advance received",
    tone: "good",
    description:
      "The customer paid in advance. It becomes credit they can spend on future purchases.",
  },
  ADVANCE_REDEEMED: {
    label: "Credit spent",
    tone: "info",
    description: "Part of a sale was paid from the customer's credit.",
  },
  MANUAL_ADJUSTMENT: {
    label: "Manual correction",
    tone: "neutral",
    description: "A Manager corrected the balance by hand.",
  },
  SALE_VOID: {
    label: "Sale voided",
    tone: "neutral",
    description: "A sale on account was cancelled, so its amount was taken back off.",
  },
};
