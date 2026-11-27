import type { Tone } from "@/components/ui/tone-badge";
import { FormatMoney } from "@/lib/format";
import type { SaleDTO } from "./validators/sale.schema";

// "LOAN" is the stored enum; "On account" is what the business calls a
// sale the customer pays for later (or with credit they already have).
export const PAYMENT_TYPE_META: Record<
  "CASH" | "LOAN",
  { label: string; tone: Tone }
> = {
  CASH: { label: "Cash", tone: "good" },
  LOAN: { label: "On account", tone: "info" },
};

// The price a sale was charged at, in the unit it was entered in: per
// packet for a packet or mixed sale, per carton otherwise.
export function SaleUnitPriceLabel(
  sale: Pick<SaleDTO, "inputUnitName" | "pricePerCarton" | "pricePerPacket">,
): string {
  return sale.inputUnitName === "PACKET"
    ? `${FormatMoney(sale.pricePerPacket)} / packet`
    : `${FormatMoney(sale.pricePerCarton)} / carton`;
}
