import type { Prisma } from "@/generated/prisma/client";
import { type CartonSize, KG_PER_CARTON } from "@/lib/packing";

// Decimal half of src/lib/packing.ts: conversions between the kg the
// database stores and the cartons people see. Prices and costs are stored
// per kg too and shown per carton. Type-only Prisma import so the DTO
// mappers that use these stay safe to import from client code; callers
// that start from a plain number build the Decimal themselves.

// Carton counts keep 6 dp — finer than one piece (1/240 ≈ 0.0042), so
// the client can always split them back into whole packets and pieces.
const CARTON_DP = 6;

export function CartonsFromKg(
  kg: Prisma.Decimal,
  size: CartonSize,
): Prisma.Decimal {
  return kg.dividedBy(KG_PER_CARTON[size]).toDecimalPlaces(CARTON_DP);
}

export function CartonsString(kg: Prisma.Decimal, size: CartonSize): string {
  return CartonsFromKg(kg, size).toString();
}

export function KgFromCartons(
  cartons: Prisma.Decimal,
  size: CartonSize,
): Prisma.Decimal {
  return cartons.times(KG_PER_CARTON[size]);
}

// A per-kg price or cost, shown per carton (rounded to the cent).
export function PerCarton(amountPerKg: Prisma.Decimal, size: CartonSize) {
  return amountPerKg.times(KG_PER_CARTON[size]).toDecimalPlaces(2).toString();
}

// A per-carton price or cost as entered, stored per kg.
export function PerKg(
  amountPerCarton: Prisma.Decimal,
  size: CartonSize,
): Prisma.Decimal {
  return amountPerCarton.dividedBy(KG_PER_CARTON[size]);
}
