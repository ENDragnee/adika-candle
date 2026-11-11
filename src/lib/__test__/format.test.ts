import { describe, expect, it } from "vitest";
import {
  DescribeLoanBalance,
  FormatDateKey,
  FormatDateTime,
  FormatKg,
  FormatMoney,
  FormatPercent,
  FormatRelative,
  FormatSignedMoney,
  Pluralize,
} from "../format";

// Intl inserts a non-breaking space after the currency code.
const nbsp = (text: string) => text.replace(/ /g, " ");

describe("format", () => {
  it("formats money with currency and separators", () => {
    expect(nbsp(FormatMoney("6050"))).toBe("ETB 6,050.00");
    expect(nbsp(FormatMoney(-12.5))).toBe("-ETB 12.50");
  });

  it("renders missing values as an em dash, never 0", () => {
    expect(FormatMoney(null)).toBe("—");
    expect(FormatKg(undefined)).toBe("—");
    expect(FormatPercent(null)).toBe("—");
  });

  it("formats kg", () => {
    expect(FormatKg("1250.5")).toBe("1,250.5 kg");
    expect(FormatKg("-10")).toBe("-10 kg");
  });

  it("formats signed amounts", () => {
    expect(nbsp(FormatSignedMoney(500))).toBe("+ETB 500.00");
    expect(nbsp(FormatSignedMoney(-200))).toBe("−ETB 200.00");
    expect(FormatPercent("14.3", { signed: true })).toBe("+14.3%");
    expect(FormatPercent("-5")).toBe("−5.0%");
  });

  it("shows times in the business time zone", () => {
    // 22:30 UTC is 01:30 the next day in Addis Ababa.
    expect(FormatDateTime("2026-11-10T22:30:00Z")).toBe("11 Nov 2026, 01:30");
    expect(FormatDateKey("2026-11-11")).toBe("11 Nov");
  });

  it("describes loan balances in words", () => {
    expect(DescribeLoanBalance("225").direction).toBe("OWES");
    expect(nbsp(DescribeLoanBalance("-500").amount)).toBe("ETB 500.00");
    expect(DescribeLoanBalance("-500").direction).toBe("CREDIT");
    expect(DescribeLoanBalance("0").label).toBe("Settled");
  });

  it("formats relative time", () => {
    const now = new Date("2026-11-11T12:00:00Z");
    expect(FormatRelative("2026-11-08T12:00:00Z", now)).toBe("3 days ago");
    expect(FormatRelative("2026-11-11T11:59:50Z", now)).toBe("just now");
  });

  it("pluralizes", () => {
    expect(Pluralize(1, "sale")).toBe("1 sale");
    expect(Pluralize(3, "sale")).toBe("3 sales");
  });
});
