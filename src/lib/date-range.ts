import {
  AddBusinessDays,
  AddBusinessMonths,
  BusinessDateKey,
  StartOfBusinessDate,
  StartOfBusinessDay,
  StartOfBusinessMonth,
} from "./business-time";

// Date-range filtering shared by Sales, Activities and Analytics (Epic 22).
// Ranges are inclusive business-local calendar dates ("YYYY-MM-DD"), which
// is what every API accepts as `from`/`to`.

export const DATE_RANGE_PRESETS = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "90d",
  "month",
  "last-month",
  "year",
  "all",
  "custom",
] as const;
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  month: "This month",
  "last-month": "Last month",
  year: "Last 12 months",
  all: "All time",
  custom: "Custom range",
};

export interface DateRangeValue {
  preset: DateRangePreset;
  // Only read for "custom".
  from?: string;
  to?: string;
}

export interface ResolvedRange {
  from?: string;
  to?: string;
}

// The longest window any report accepts (keeps a single request bounded).
export const MAX_RANGE_DAYS = 366;

export function ResolveDateRange(
  value: DateRangeValue,
  now: Date = new Date(),
): ResolvedRange {
  const today = StartOfBusinessDay(now);
  const key = BusinessDateKey;
  switch (value.preset) {
    case "today":
      return { from: key(today), to: key(today) };
    case "yesterday": {
      const day = AddBusinessDays(today, -1);
      return { from: key(day), to: key(day) };
    }
    case "7d":
      return { from: key(AddBusinessDays(today, -6)), to: key(today) };
    case "30d":
      return { from: key(AddBusinessDays(today, -29)), to: key(today) };
    case "90d":
      return { from: key(AddBusinessDays(today, -89)), to: key(today) };
    case "month":
      return { from: key(StartOfBusinessMonth(now)), to: key(today) };
    case "last-month": {
      const thisMonth = StartOfBusinessMonth(now);
      const lastMonth = AddBusinessMonths(thisMonth, -1);
      return {
        from: key(lastMonth),
        to: key(AddBusinessDays(thisMonth, -1)),
      };
    }
    case "year":
      return { from: key(AddBusinessDays(today, -364)), to: key(today) };
    case "custom":
      return { from: value.from, to: value.to };
    default:
      return {};
  }
}

// Inclusive number of calendar days in a resolved range.
export function RangeDays(range: ResolvedRange): number | null {
  if (!range.from || !range.to) return null;
  const from = StartOfBusinessDate(range.from).getTime();
  const to = StartOfBusinessDate(range.to).getTime();
  return Math.round((to - from) / 86_400_000) + 1;
}

// Why a custom range can't be used yet, or null when it's fine.
export function ValidateCustomRange(
  range: ResolvedRange,
  maxDays: number | null = MAX_RANGE_DAYS,
  today: string = BusinessDateKey(new Date()),
): string | null {
  if (!range.from || !range.to) return "Pick both a start and an end date";
  if (range.from > range.to) return "The start date is after the end date";
  if (range.to > today) return "The end date can't be in the future";
  const days = RangeDays(range);
  if (maxDays !== null && days !== null && days > maxDays) {
    return `Pick a range of ${maxDays} days or less`;
  }
  return null;
}
