"use client";

import {
  CaretDownIcon,
  ClockCounterClockwiseIcon,
  DesktopIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { ListSearch } from "@/components/ui/list-search";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToneBadge, ToneColor } from "@/components/ui/tone-badge";
import { BusinessDateKey } from "@/lib/business-time";
import { type DateRangeValue, ResolveDateRange } from "@/lib/date-range";
import { DescribeDevice } from "@/lib/describe-device";
import { FormatDate, FormatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useActivities, useActivityFacets } from "../hooks/use-activities";
import { DescribeActivityType, HumanizeKey } from "../labels";
import type { ActivityDTO } from "../validators/activity.schema";

const ALL = "__all__";

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Addis_Ababa",
  hour: "2-digit",
  minute: "2-digit",
});

function DayHeading(dateKey: string): string {
  const today = BusinessDateKey(new Date());
  const yesterday = BusinessDateKey(new Date(Date.now() - 86_400_000));
  if (dateKey === today) return "Today";
  if (dateKey === yesterday) return "Yesterday";
  return FormatDate(`${dateKey}T12:00:00Z`);
}

function FormatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ActivityRow({ activity }: { activity: ActivityDTO }) {
  const [open, setOpen] = useState(false);
  const { label, icon: Icon } = DescribeActivityType(activity.type);
  const device = DescribeDevice(activity.userAgent);
  const changes = Object.entries(activity.changes ?? {});
  const hasDetails = changes.length > 0 || activity.ipAddress || device;

  return (
    <li className="relative flex gap-3 pb-5 pl-1 last:pb-0">
      {/* Timeline rail. */}
      <span
        aria-hidden="true"
        className="absolute top-8 bottom-0 left-[1.15rem] w-px bg-border group-last/day:hidden"
      />
      <span
        className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted ring-4 ring-background"
        title={label}
      >
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-sm font-medium leading-snug">
            {activity.severity !== "INFO" && (
              <WarningIcon
                weight="fill"
                className="mr-1 inline size-3.5 align-[-2px]"
                style={{
                  color: ToneColor(
                    activity.severity === "ERROR" ? "critical" : "warning",
                  ),
                }}
                aria-label="Notable change"
              />
            )}
            {activity.message}
          </p>
          <time
            dateTime={activity.createdAt}
            title={FormatDateTime(activity.createdAt)}
            className="shrink-0 text-xs text-muted-foreground tabular-nums"
          >
            {timeFormatter.format(new Date(activity.createdAt))}
          </time>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {activity.userName ??
              (activity.userId ? "A removed user" : "Not signed in")}
          </span>
          <span aria-hidden="true">·</span>
          <ToneBadge tone="neutral">{label}</ToneBadge>
          {hasDetails && (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              className="inline-flex items-center gap-0.5 font-medium hover:text-foreground"
            >
              {open ? "Hide details" : "Details"}
              <CaretDownIcon
                className={cn(
                  "size-3 transition-transform motion-reduce:transition-none",
                  open && "rotate-180",
                )}
              />
            </button>
          )}
        </div>
        {open && (
          <div className="mt-1 flex flex-col gap-2 rounded-lg bg-muted/50 p-3 text-xs">
            {changes.length > 0 && (
              <dl className="grid grid-cols-[minmax(0,10rem)_1fr] gap-x-3 gap-y-1">
                {changes.map(([key, value]) => (
                  <div key={key} className="contents">
                    <dt className="text-muted-foreground">
                      {HumanizeKey(key)}
                    </dt>
                    <dd className="break-words">{FormatValue(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {(device || activity.ipAddress) && (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <DesktopIcon className="size-3.5" />
                {[device, activity.ipAddress].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      {Array.from({ length: 6 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
        <div key={index} className="flex gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

// /manager/activities (Epic 22): everything anyone changed and every
// sign-in, newest first, grouped by day. Cursor-paginated — "Load more"
// (and scrolling to the end) fetches the entries after the last one shown.
export function ActivityLog() {
  const [range, setRange] = useState<DateRangeValue>({ preset: "7d" });
  const [userId, setUserId] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [notableOnly, setNotableOnly] = useState(false);
  const [search, setSearch] = useState<string | undefined>(undefined);
  const { data: facets } = useActivityFacets();

  const filters = {
    ...ResolveDateRange(range),
    ...(userId !== ALL && { userId }),
    ...(type !== ALL && { type }),
    ...(notableOnly && { severity: "WARN" as const }),
    ...(search && { search }),
  };
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useActivities(filters);

  const rows = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );
  const days = useMemo(() => {
    const groups = new Map<string, ActivityDTO[]>();
    for (const row of rows) {
      const key = BusinessDateKey(new Date(row.createdAt));
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [...groups.entries()];
  }, [rows]);

  // Load the next page automatically when the end of the list scrolls
  // into view; the button stays as the keyboard/no-JS-observer path.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter
          value={range}
          onChange={setRange}
          presets={["today", "yesterday", "7d", "30d", "month", "90d", "all"]}
          maxDays={null}
          className="w-52"
        />
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger className="w-44" aria-label="Person">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Everyone</SelectItem>
            {facets?.users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-48" aria-label="Area">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All areas</SelectItem>
            {facets?.types.map((item) => (
              <SelectItem key={item} value={item}>
                {DescribeActivityType(item).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={notableOnly ? "secondary" : "outline"}
          aria-pressed={notableOnly}
          onClick={() => setNotableOnly((value) => !value)}
        >
          <WarningIcon data-icon="inline-start" />
          Notable only
        </Button>
        <ListSearch
          placeholder="Search activity…"
          onSearch={setSearch}
          className="w-full sm:w-56"
        />
      </div>

      {isLoading ? (
        <TimelineSkeleton />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-12 text-center">
          <ClockCounterClockwiseIcon className="size-7 text-muted-foreground" />
          <p className="text-sm font-medium">No activity for these filters</p>
          <p className="text-xs text-muted-foreground">
            Try a longer date range or clear a filter.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {days.map(([day, items]) => (
            <section key={day} className="flex flex-col gap-3">
              <h2 className="sticky top-0 z-20 -mx-1 bg-background/95 px-1 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur">
                {DayHeading(day)}
              </h2>
              <ol className="group/day flex flex-col">
                {items.map((activity) => (
                  <ActivityRow key={activity.id} activity={activity} />
                ))}
              </ol>
            </section>
          ))}
          <div ref={sentinel} />
          {hasNextPage ? (
            <Button
              variant="outline"
              className="self-center"
              loading={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              Load older activity
            </Button>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              That's everything for these filters.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
