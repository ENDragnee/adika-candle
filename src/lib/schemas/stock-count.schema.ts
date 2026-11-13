import { z } from "zod";

// A physical stock count (Epic 21): the user enters what's actually on
// hand and why they're correcting it; the server works out the difference
// from the recorded balance and writes it as one ADJUSTMENT ledger entry.
// Shared by finished-goods stock and raw materials.
export const StockCountInputSchema = z.object({
  countedKg: z.coerce.number().finite().min(0, "A count can't be negative"),
  reason: z
    .string()
    .trim()
    .min(3, "Say briefly why the balance is being corrected")
    .max(500),
});

export type StockCountInput = z.infer<typeof StockCountInputSchema>;
