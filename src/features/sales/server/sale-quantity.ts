import { Prisma } from "@/generated/prisma/client";
import { KgFromCartons, KgFromPackets } from "@/lib/carton-decimal";
import {
  SALE_UNIT_MODE_META,
  SaleModeAllows,
  type SaleUnitMode,
} from "@/lib/feature-flags/flags";
import {
  type CartonSize,
  KG_PER_CARTON,
  PACKETS_PER_CARTON,
} from "@/lib/packing";
import { DomainError } from "@/lib/server/domain-error";

// Rejects units the sale-unit-mode flag doesn't allow. The form only
// offers allowed units, so this fires on a stale tab (the Admin switched
// modes after it loaded) or a direct API call.
export function AssertSaleUnitsAllowed(
  mode: SaleUnitMode,
  quantity: { cartons: number; packets: number },
) {
  if (SaleModeAllows(mode, quantity)) return;
  throw new DomainError(
    `Sales are set to ${SALE_UNIT_MODE_META[mode].label.toLowerCase()} — reload the page and enter the sale again`,
    400,
    "UNIT_NOT_ALLOWED",
    { mode },
  );
}

// What a sale of `cartons` + `packets` comes to, and what it snapshots.
// A carton-only sale is exactly as before (inputUnitName "CARTON"). Any
// packets make it a packet sale: inputQuantity is the total in packets
// and quantityKg is worked out from that whole total in one division.
// inputRatioToKg (kg per packet, rounded) is informational there —
// quantityKg is the figure every balance uses.
export function SaleQuantity(
  quantity: { cartons: number; packets: number },
  size: CartonSize,
) {
  const cartons = new Prisma.Decimal(quantity.cartons);
  const kgPerCarton = new Prisma.Decimal(KG_PER_CARTON[size]);

  if (quantity.packets === 0) {
    return {
      quantityKg: KgFromCartons(cartons, size),
      inputUnitName: "CARTON" as const,
      inputQuantity: cartons,
      inputRatioToKg: kgPerCarton,
    };
  }

  const totalPackets = cartons.times(PACKETS_PER_CARTON).plus(quantity.packets);
  return {
    quantityKg: KgFromPackets(totalPackets, size),
    inputUnitName: "PACKET" as const,
    inputQuantity: totalPackets,
    inputRatioToKg: kgPerCarton
      .dividedBy(PACKETS_PER_CARTON)
      .toDecimalPlaces(12),
  };
}
