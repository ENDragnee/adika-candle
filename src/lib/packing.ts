import { BUSINESS_LOCALE } from "@/configs/global-vars";

// Packing math for the whole app. Cartons are the only unit people enter
// (accepting stock, selling); packets and pieces exist only for reading
// quantities back. Quantities are stored in kg — cartons × the product's
// kg per carton — so a carton of Plus and a carton of Normal stay
// distinct, and the kg figure doubles as the wax it took to make them.
// Client-safe: no Prisma imports.

export const PACKETS_PER_CARTON = 30;
export const PIECES_PER_PACKET = 8;
export const PIECES_PER_CARTON = PACKETS_PER_CARTON * PIECES_PER_PACKET;

export const CARTON_SIZES = ["NORMAL", "PLUS"] as const;
export type CartonSize = (typeof CARTON_SIZES)[number];

// Wax per carton; the wick (kir) is negligible.
export const KG_PER_CARTON: Record<CartonSize, number> = {
  NORMAL: 7,
  PLUS: 8.5,
};

export const CARTON_SIZE_META: Record<
  CartonSize,
  { label: string; description: string }
> = {
  NORMAL: { label: "Normal", description: "7 kg of wax per carton" },
  PLUS: { label: "Plus", description: "8.5 kg of wax per carton" },
};

// The raw material production draws from (matched case-insensitively).
export const WAX_MATERIAL_NAME = "Wax";

export const PACKING_UNITS = ["CARTON", "PACKET", "PIECE"] as const;
export type PackingUnit = (typeof PACKING_UNITS)[number];

export const PACKING_UNIT_META: Record<
  PackingUnit,
  { label: string; short: string; perCarton: number }
> = {
  CARTON: { label: "Cartons", short: "ctn", perCarton: 1 },
  PACKET: { label: "Packets", short: "pkt", perCarton: PACKETS_PER_CARTON },
  PIECE: { label: "Pieces", short: "pcs", perCarton: PIECES_PER_CARTON },
};

type NumericInput = string | number | null | undefined;

function ToNumber(value: NumericInput): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function KgToCartons(kg: number, size: CartonSize): number {
  return kg / KG_PER_CARTON[size];
}

export function CartonsToKg(cartons: number, size: CartonSize): number {
  return cartons * KG_PER_CARTON[size];
}

// A carton figure expressed in another unit (12 cartons → 360 packets).
export function CartonsIn(cartons: number, unit: PackingUnit): number {
  return cartons * PACKING_UNIT_META[unit].perCarton;
}

const quantityFormatter = new Intl.NumberFormat(BUSINESS_LOCALE, {
  maximumFractionDigits: 2,
});

// "12.5 ctn", "375 pkt", "3,000 pcs". Pieces are whole by definition.
export function FormatPacking(
  cartons: NumericInput,
  unit: PackingUnit = "CARTON",
  { signed = false } = {},
): string {
  const number = ToNumber(cartons);
  if (number === null) return "—";
  const value = CartonsIn(number, unit);
  const rounded = unit === "PIECE" ? Math.round(value) : value;
  const text = `${quantityFormatter.format(Math.abs(rounded))} ${PACKING_UNIT_META[unit].short}`;
  if (rounded < 0) return `−${text}`;
  return signed && rounded > 0 ? `+${text}` : text;
}

// Whole cartons + leftover packets + leftover pieces, rounded to the
// nearest piece. Sign is kept separately so a negative balance reads
// "−2 ctn 5 pkt", not "−2 ctn −5 pkt".
export function SplitPacking(cartons: number) {
  const totalPieces = Math.round(Math.abs(cartons) * PIECES_PER_CARTON);
  return {
    negative: cartons < 0 && totalPieces > 0,
    cartons: Math.floor(totalPieces / PIECES_PER_CARTON),
    packets: Math.floor((totalPieces % PIECES_PER_CARTON) / PIECES_PER_PACKET),
    pieces: totalPieces % PIECES_PER_PACKET,
  };
}

// "12 ctn · 15 pkt · 3 pcs" — the remaining-stock reading. Zero parts are
// dropped except when everything is zero ("0 ctn").
export function FormatPackingBreakdown(cartons: NumericInput): string {
  const number = ToNumber(cartons);
  if (number === null) return "—";
  const split = SplitPacking(number);
  const parts = [
    split.cartons > 0 && `${quantityFormatter.format(split.cartons)} ctn`,
    split.packets > 0 && `${split.packets} pkt`,
    split.pieces > 0 && `${split.pieces} pcs`,
  ].filter(Boolean);
  const text = parts.length > 0 ? parts.join(" · ") : "0 ctn";
  return split.negative ? `−${text}` : text;
}

// Cartons + packets + pieces typed into a count form, back to cartons.
export function PackingToCartons(parts: {
  cartons: number;
  packets: number;
  pieces: number;
}): number {
  return (
    parts.cartons +
    parts.packets / PACKETS_PER_CARTON +
    parts.pieces / PIECES_PER_CARTON
  );
}
