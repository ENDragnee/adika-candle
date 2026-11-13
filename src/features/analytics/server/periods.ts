import { BUSINESS_TIMEZONE } from "@/configs/global-vars";
import {
  AddBusinessDays,
  AddBusinessMonths,
  BusinessDateKey,
  StartOfBusinessDate,
  StartOfBusinessDay,
  StartOfBusinessMonth,
  StartOfBusinessWeek,
} from "@/lib/business-time";

export type ReportGranularity = "DAY" | "WEEK" | "MONTH";

export interface PeriodBounds {
  start: Date;
  end: Date;
  // Stable machine key ("2026-11-11") for chart x values / exports.
  key: string;
  // Human label in the business time zone ("Wed 11 Nov", "Week of 9 Nov",
  // "Nov 2026").
  label: string;
}

export const TREND_PERIOD_COUNTS: Record<ReportGranularity, number> = {
  DAY: 14,
  WEEK: 8,
  MONTH: 6,
};

const dayLabel = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIMEZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});
const shortDayLabel = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIMEZONE,
  day: "numeric",
  month: "short",
});
const monthLabel = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIMEZONE,
  month: "short",
  year: "numeric",
});

function StartOfPeriod(granularity: ReportGranularity, instant: Date): Date {
  if (granularity === "MONTH") return StartOfBusinessMonth(instant);
  if (granularity === "WEEK") return StartOfBusinessWeek(instant);
  return StartOfBusinessDay(instant);
}

function AddPeriods(
  granularity: ReportGranularity,
  start: Date,
  count: number,
): Date {
  if (granularity === "MONTH") return AddBusinessMonths(start, count);
  if (granularity === "WEEK") return AddBusinessDays(start, count * 7);
  return AddBusinessDays(start, count);
}

function LabelFor(granularity: ReportGranularity, start: Date): string {
  if (granularity === "MONTH") return monthLabel.format(start);
  if (granularity === "WEEK") return `Week of ${shortDayLabel.format(start)}`;
  return dayLabel.format(start);
}

// The `count` periods ending with the one `offset` periods before the
// current one (offset 0 = the period containing `now`, -1 = the one
// before, ...). The last element is the selected period.
export function BuildPeriodWindow(
  granularity: ReportGranularity,
  now: Date,
  offset = 0,
  count = TREND_PERIOD_COUNTS[granularity],
): PeriodBounds[] {
  const selectedStart = AddPeriods(
    granularity,
    StartOfPeriod(granularity, now),
    Math.min(0, offset),
  );
  const periods: PeriodBounds[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const start = AddPeriods(granularity, selectedStart, -i);
    const end = AddPeriods(granularity, start, 1);
    periods.push({
      start,
      end,
      key: BusinessDateKey(start),
      label: LabelFor(granularity, start),
    });
  }

  return periods;
}

// One bucket per local calendar day, `days` long, ending today.
export function BuildDailyWindow(now: Date, days: number): PeriodBounds[] {
  return BuildPeriodWindow("DAY", now, 0, days);
}

// One bucket per local day from `fromKey` to `toKey` inclusive (Epic 22
// custom ranges). Long ranges are bucketed by week so a chart never has
// hundreds of slivers.
export function BuildRangeBuckets(
  fromKey: string,
  toKey: string,
): PeriodBounds[] {
  const start = StartOfBusinessDate(fromKey);
  const end = AddBusinessDays(StartOfBusinessDate(toKey), 1);
  const dayCount = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const step = dayCount > 92 ? 7 : 1;
  const buckets: PeriodBounds[] = [];
  for (let cursor = start; cursor < end; ) {
    const next = AddBusinessDays(cursor, step);
    buckets.push({
      start: cursor,
      end: next < end ? next : end,
      key: BusinessDateKey(cursor),
      label:
        step === 7
          ? `Week of ${shortDayLabel.format(cursor)}`
          : dayLabel.format(cursor),
    });
    cursor = next;
  }
  return buckets;
}

// The whole custom range as a single period.
export function BuildRangePeriod(fromKey: string, toKey: string): PeriodBounds {
  const start = StartOfBusinessDate(fromKey);
  const end = AddBusinessDays(StartOfBusinessDate(toKey), 1);
  return {
    start,
    end,
    key: fromKey,
    label:
      fromKey === toKey
        ? dayLabel.format(start)
        : `${shortDayLabel.format(start)} – ${shortDayLabel.format(AddBusinessDays(end, -1))}`,
  };
}
