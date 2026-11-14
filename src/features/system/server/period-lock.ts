import { BusinessDateKey } from "@/lib/business-time";
import { DomainError } from "@/lib/server/domain-error";
import { GetSystemSettings } from "./settings";

// Closed periods (Epic 24). Every write is dated "now", so the only way
// to change a closed period is to void or restore one of its sales —
// analytics drop voided sales from the day they were made. This refuses
// that for any sale dated on or before the lock date (business time).

export function IsInLockedPeriod(
  date: Date,
  lockedThrough: string | null,
): boolean {
  return lockedThrough !== null && BusinessDateKey(date) <= lockedThrough;
}

export async function AssertPeriodOpen(
  date: Date,
  action: string,
): Promise<void> {
  const { periodLock } = await GetSystemSettings();
  if (IsInLockedPeriod(date, periodLock.lockedThrough)) {
    throw new DomainError(
      `The books are closed through ${periodLock.lockedThrough}, so you can't ${action} a sale from then. An administrator can reopen the period on the System page.`,
      409,
      "PERIOD_LOCKED",
      { lockedThrough: periodLock.lockedThrough },
    );
  }
}
