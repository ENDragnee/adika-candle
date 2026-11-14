import type { Tone } from "@/components/ui/tone-badge";

// Plain-language names for StockEntryType (Epic 21) — the raw enum is a
// fine database key but meaningless on screen.
export const STOCK_ENTRY_META: Record<
  "ACCEPT" | "SALE" | "ADJUSTMENT" | "SALE_VOID" | "SALE_RESTORE",
  { label: string; tone: Tone }
> = {
  ACCEPT: { label: "Accepted", tone: "good" },
  SALE: { label: "Sold", tone: "info" },
  ADJUSTMENT: { label: "Stock count", tone: "warning" },
  SALE_VOID: { label: "Sale voided", tone: "neutral" },
  SALE_RESTORE: { label: "Sale restored", tone: "info" },
};
