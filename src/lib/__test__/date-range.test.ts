import { describe, expect, it } from "vitest";
import {
  RangeDays,
  ResolveDateRange,
  ValidateCustomRange,
} from "../date-range";

// 2026-11-12 09:00 in Addis Ababa.
const NOW = new Date("2026-11-12T06:00:00Z");

describe("ResolveDateRange", () => {
  it("resolves presets to inclusive local dates", () => {
    expect(ResolveDateRange({ preset: "today" }, NOW)).toEqual({
      from: "2026-11-12",
      to: "2026-11-12",
    });
    expect(ResolveDateRange({ preset: "7d" }, NOW)).toEqual({
      from: "2026-11-06",
      to: "2026-11-12",
    });
    expect(ResolveDateRange({ preset: "last-month" }, NOW)).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(ResolveDateRange({ preset: "all" }, NOW)).toEqual({});
  });

  it("passes custom dates through", () => {
    expect(
      ResolveDateRange({
        preset: "custom",
        from: "2026-01-01",
        to: "2026-01-31",
      }),
    ).toEqual({ from: "2026-01-01", to: "2026-01-31" });
  });
});

describe("ValidateCustomRange", () => {
  const today = "2026-11-12";
  it("accepts a sane range", () => {
    expect(
      ValidateCustomRange({ from: "2026-10-01", to: "2026-10-31" }, 366, today),
    ).toBeNull();
    expect(RangeDays({ from: "2026-10-01", to: "2026-10-31" })).toBe(31);
  });

  it("rejects reversed, future, missing and too-long ranges", () => {
    expect(
      ValidateCustomRange({ from: "2026-10-31", to: "2026-10-01" }, 366, today),
    ).toMatch(/after/);
    expect(
      ValidateCustomRange({ from: "2026-11-01", to: "2026-12-01" }, 366, today),
    ).toMatch(/future/);
    expect(ValidateCustomRange({ from: "2026-11-01" }, 366, today)).toMatch(
      /both/,
    );
    expect(
      ValidateCustomRange({ from: "2024-01-01", to: "2026-11-01" }, 366, today),
    ).toMatch(/366/);
  });
});
