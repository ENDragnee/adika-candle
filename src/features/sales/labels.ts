import type { Tone } from "@/components/ui/tone-badge";

// "LOAN" is the stored enum; "On account" is what the business calls a
// sale the customer pays for later (or with credit they already have).
export const PAYMENT_TYPE_META: Record<
  "CASH" | "LOAN",
  { label: string; tone: Tone }
> = {
  CASH: { label: "Cash", tone: "good" },
  LOAN: { label: "On account", tone: "info" },
};
