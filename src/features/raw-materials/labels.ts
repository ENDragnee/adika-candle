import type { Tone } from "@/components/ui/tone-badge";

export const MATERIAL_ENTRY_META: Record<
  "RECEIVED" | "CONSUMED" | "ADJUSTMENT",
  { label: string; tone: Tone }
> = {
  RECEIVED: { label: "Received", tone: "good" },
  CONSUMED: { label: "Used in production", tone: "info" },
  ADJUSTMENT: { label: "Stock count", tone: "warning" },
};

// RECEIVED/CONSUMED store a positive magnitude (direction implied by
// type); ADJUSTMENT stores the signed difference — see schema.prisma.
export function MaterialEntryDelta(type: string, quantityKg: string): number {
  const quantity = Number(quantityKg);
  if (type === "CONSUMED") return -quantity;
  return quantity;
}
