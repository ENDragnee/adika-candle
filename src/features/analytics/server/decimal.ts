import { Prisma } from "@/generated/prisma/client";

export const ZERO = new Prisma.Decimal(0);

export function Sum<T>(items: T[], pick: (item: T) => Prisma.Decimal) {
  return items.reduce((sum, item) => sum.plus(pick(item)), ZERO);
}

// Margin as a 1-dp percent string, or null when there's no revenue to
// divide by — callers render null as "—", never as 0% or 100%.
export function MarginPercent(
  revenue: Prisma.Decimal,
  cost: Prisma.Decimal,
): string | null {
  if (revenue.lessThanOrEqualTo(0)) return null;
  return revenue.minus(cost).dividedBy(revenue).times(100).toFixed(1);
}

export function InPeriod(createdAt: Date, period: { start: Date; end: Date }) {
  return createdAt >= period.start && createdAt < period.end;
}
