import {
  BUSINESS_CURRENCY,
  BUSINESS_LOCALE,
  BUSINESS_TIMEZONE,
} from "@/configs/global-vars";

// The one place numbers, money, and dates are turned into text for the UI
// (Epic 21). Before this, every list rendered raw Decimal strings ("6050",
// "-10") and eight files each had their own `toLocaleString()` helper.
// Inputs are the API's Decimal strings (or numbers); a null/empty input
// renders as an em dash, never as 0.
//
// CSV export keeps raw numbers on purpose (spreadsheets need numbers, not
// "ETB 1,050.00"); PDF export uses these.

type NumericInput = string | number | null | undefined;

export const EMPTY_VALUE = "—";

function ToNumber(value: NumericInput): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const moneyFormatter = new Intl.NumberFormat(BUSINESS_LOCALE, {
  style: "currency",
  currency: BUSINESS_CURRENCY,
  currencyDisplay: "code",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactMoneyFormatter = new Intl.NumberFormat(BUSINESS_LOCALE, {
  notation: "compact",
  maximumFractionDigits: 1,
});

// "ETB 6,050.00". Intl puts a non-breaking space after the code; kept, so
// the code never wraps away from its amount.
export function FormatMoney(value: NumericInput): string {
  const number = ToNumber(value);
  return number === null ? EMPTY_VALUE : moneyFormatter.format(number);
}

// Short axis/tick labels: "6.1K", "1.2M". No currency code — the axis
// title or tooltip carries it.
export function FormatCompactNumber(value: NumericInput): string {
  const number = ToNumber(value);
  return number === null ? EMPTY_VALUE : compactMoneyFormatter.format(number);
}

const kgFormatter = new Intl.NumberFormat(BUSINESS_LOCALE, {
  maximumFractionDigits: 2,
});

// "1,250.5 kg".
export function FormatKg(value: NumericInput): string {
  const number = ToNumber(value);
  return number === null ? EMPTY_VALUE : `${kgFormatter.format(number)} kg`;
}

export function FormatNumber(value: NumericInput, maxFractionDigits = 2) {
  const number = ToNumber(value);
  if (number === null) return EMPTY_VALUE;
  return new Intl.NumberFormat(BUSINESS_LOCALE, {
    maximumFractionDigits: maxFractionDigits,
  }).format(number);
}

// "40.0%"; signed adds a leading "+" for positive deltas.
export function FormatPercent(
  value: NumericInput,
  { signed = false, fractionDigits = 1 } = {},
): string {
  const number = ToNumber(value);
  if (number === null) return EMPTY_VALUE;
  const text = `${Math.abs(number).toFixed(fractionDigits)}%`;
  if (number < 0) return `−${text}`;
  return signed && number > 0 ? `+${text}` : text;
}

// Signed money for ledger movements: "+ETB 500.00" / "−ETB 200.00".
export function FormatSignedMoney(value: NumericInput): string {
  const number = ToNumber(value);
  if (number === null) return EMPTY_VALUE;
  const text = moneyFormatter.format(Math.abs(number));
  if (number > 0) return `+${text}`;
  if (number < 0) return `−${text}`;
  return text;
}

export function FormatSignedKg(value: NumericInput): string {
  const number = ToNumber(value);
  if (number === null) return EMPTY_VALUE;
  const text = `${kgFormatter.format(Math.abs(number))} kg`;
  if (number > 0) return `+${text}`;
  if (number < 0) return `−${text}`;
  return text;
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIMEZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIMEZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIMEZONE,
  day: "numeric",
  month: "short",
});

// Always shown in the business time zone, so every person (and the
// analytics day buckets) agree on which day a sale happened.
export function FormatDateTime(value: string | Date | null | undefined) {
  if (!value) return EMPTY_VALUE;
  return dateTimeFormatter.format(new Date(value));
}

export function FormatDate(value: string | Date | null | undefined) {
  if (!value) return EMPTY_VALUE;
  return dateFormatter.format(new Date(value));
}

// "8 Nov" — for chart axes where the year is obvious from context.
export function FormatShortDate(value: string | Date | null | undefined) {
  if (!value) return EMPTY_VALUE;
  return shortDateFormatter.format(new Date(value));
}

// For "YYYY-MM-DD" business-date keys from the analytics API (midday UTC
// keeps the key on its own calendar day in any zone within ±12h).
export function FormatDateKey(dateKey: string, { short = true } = {}) {
  if (!dateKey) return EMPTY_VALUE;
  const instant = new Date(`${dateKey}T12:00:00Z`);
  return (short ? shortDateFormatter : dateFormatter).format(instant);
}

const relativeFormatter = new Intl.RelativeTimeFormat(BUSINESS_LOCALE, {
  numeric: "auto",
});

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

// "3 days ago", "yesterday", "just now".
export function FormatRelative(
  value: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) return EMPTY_VALUE;
  const seconds = (new Date(value).getTime() - now.getTime()) / 1000;
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) {
      return relativeFormatter.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
}

// LoanAccount.balance in words. Sign convention (docs/DECISIONS.md):
// positive = the customer owes the business, negative = the business
// owes the customer (credit, e.g. an unspent advance).
export type BalanceDirection = "OWES" | "CREDIT" | "SETTLED";

export function DescribeLoanBalance(balance: NumericInput): {
  direction: BalanceDirection;
  label: string;
  amount: string;
} {
  const number = ToNumber(balance) ?? 0;
  if (number > 0) {
    return {
      direction: "OWES",
      label: "Owes you",
      amount: FormatMoney(number),
    };
  }
  if (number < 0) {
    return {
      direction: "CREDIT",
      label: "You owe (credit)",
      amount: FormatMoney(-number),
    };
  }
  return { direction: "SETTLED", label: "Settled", amount: FormatMoney(0) };
}

// "1 sale" / "3 sales".
export function Pluralize(count: number, singular: string, plural?: string) {
  return `${FormatNumber(count, 0)} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}
