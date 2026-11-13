import { BUSINESS_TIMEZONE } from "@/configs/global-vars";

// Calendar math in the business time zone (see BUSINESS_TIMEZONE), with no
// date library: Intl gives us the zone's wall-clock parts for any instant,
// and the zone offset falls out of comparing those parts to UTC. Works for
// zones with DST too, though Addis Ababa has none.

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIMEZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

interface WallClock {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function ToWallClock(instant: Date): WallClock {
  const parts: Record<string, number> = {};
  for (const part of partsFormatter.formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

// Milliseconds the business zone is ahead of UTC at `instant`.
function ZoneOffsetMs(instant: Date): number {
  const wall = ToWallClock(instant);
  const wallAsUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
  );
  return wallAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

// The UTC instant at which the given local calendar date starts.
function LocalMidnight(year: number, month: number, day: number): Date {
  const guess = new Date(Date.UTC(year, month - 1, day));
  return new Date(guess.getTime() - ZoneOffsetMs(guess));
}

// "YYYY-MM-DD" of the local calendar day containing `instant`.
export function BusinessDateKey(instant: Date): string {
  const { year, month, day } = ToWallClock(instant);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function StartOfBusinessDay(instant: Date): Date {
  const { year, month, day } = ToWallClock(instant);
  return LocalMidnight(year, month, day);
}

// Shifts by whole local calendar days (safe across DST, unlike +24h).
export function AddBusinessDays(dayStart: Date, days: number): Date {
  const { year, month, day } = ToWallClock(dayStart);
  return LocalMidnight(year, month, day + days);
}

export function AddBusinessMonths(dayStart: Date, months: number): Date {
  const { year, month, day } = ToWallClock(dayStart);
  return LocalMidnight(year, month + months, day);
}

export function StartOfBusinessWeek(instant: Date): Date {
  const dayStart = StartOfBusinessDay(instant);
  const { year, month, day } = ToWallClock(dayStart);
  // Day of week of the local date (0 = Sunday), computed on the calendar
  // date itself so the zone offset can't shift it.
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const diffToMonday = weekday === 0 ? 6 : weekday - 1;
  return AddBusinessDays(dayStart, -diffToMonday);
}

export function StartOfBusinessMonth(instant: Date): Date {
  const { year, month } = ToWallClock(instant);
  return LocalMidnight(year, month, 1);
}

// Start of the trailing window of `days` local calendar days, today
// inclusive — e.g. days=30 covers today plus the 29 days before it.
export function TrailingWindowStart(now: Date, days: number): Date {
  return AddBusinessDays(StartOfBusinessDay(now), -(days - 1));
}

// The instant a "YYYY-MM-DD" local calendar date starts.
export function StartOfBusinessDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return LocalMidnight(year, month, day);
}
