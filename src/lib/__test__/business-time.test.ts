import { describe, expect, it } from "vitest";
import {
  AddBusinessDays,
  BusinessDateKey,
  StartOfBusinessDay,
  StartOfBusinessMonth,
  StartOfBusinessWeek,
  TrailingWindowStart,
} from "../business-time";

// Africa/Addis_Ababa is UTC+3 year-round.
describe("business-time", () => {
  it("puts 01:30 local on the local date, not the previous UTC date", () => {
    // 2026-11-10T22:30Z == 2026-11-11 01:30 in Addis Ababa.
    const instant = new Date("2026-11-10T22:30:00Z");
    expect(BusinessDateKey(instant)).toBe("2026-11-11");
  });

  it("starts the local day at 21:00 UTC the evening before", () => {
    const start = StartOfBusinessDay(new Date("2026-11-11T08:00:00Z"));
    expect(start.toISOString()).toBe("2026-11-10T21:00:00.000Z");
  });

  it("adds whole local days", () => {
    const start = StartOfBusinessDay(new Date("2026-11-11T08:00:00Z"));
    expect(AddBusinessDays(start, -1).toISOString()).toBe(
      "2026-11-09T21:00:00.000Z",
    );
  });

  it("finds the local Monday", () => {
    // Wednesday 2026-11-11 local.
    const monday = StartOfBusinessWeek(new Date("2026-11-11T08:00:00Z"));
    expect(BusinessDateKey(monday)).toBe("2026-11-09");
  });

  it("finds the local first of month", () => {
    const first = StartOfBusinessMonth(new Date("2026-11-11T08:00:00Z"));
    expect(first.toISOString()).toBe("2026-10-31T21:00:00.000Z");
  });

  it("builds a trailing window that includes today", () => {
    const start = TrailingWindowStart(new Date("2026-11-11T08:00:00Z"), 7);
    expect(BusinessDateKey(start)).toBe("2026-11-05");
  });
});
