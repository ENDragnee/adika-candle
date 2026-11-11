"use client";

import {
  CaretRightIcon,
  CheckCircleIcon,
  type Icon,
  InfoIcon,
  WarningIcon,
  WarningOctagonIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { ToneColor } from "@/components/ui/tone-badge";
import { FormatDate, FormatKg, FormatMoney, FormatNumber } from "@/lib/format";
import type {
  AttentionItemDTO,
  AttentionKind,
} from "../validators/analytics.schema";

const SEVERITY_META: Record<
  AttentionItemDTO["severity"],
  { icon: Icon; tone: "critical" | "warning" | "info"; label: string }
> = {
  critical: { icon: WarningOctagonIcon, tone: "critical", label: "Urgent" },
  warning: { icon: WarningIcon, tone: "warning", label: "Soon" },
  info: { icon: InfoIcon, tone: "info", label: "FYI" },
};

// One sentence per kind, written here (not on the server) so every number
// goes through the shared formatters. `action` names the fix the link
// leads to.
const COPY: Record<
  AttentionKind,
  (item: AttentionItemDTO) => { title: string; detail: string; action: string }
> = {
  NEGATIVE_STOCK: (item) => ({
    title: `${item.subjectName} shows negative stock`,
    detail: `Recorded balance is ${FormatKg(item.quantityKg)} — more was sold than was ever accepted.`,
    action: "Count stock",
  }),
  OUT_OF_STOCK: (item) => ({
    title: `${item.subjectName} is out of stock`,
    detail: "Nothing on hand to sell.",
    action: "View stock",
  }),
  LOW_STOCK: (item) => ({
    title: `${item.subjectName} is running low`,
    detail: `${FormatKg(item.quantityKg)} left, below the ${FormatKg(item.thresholdKg)} alert level${
      item.daysOfCover
        ? ` — about ${FormatNumber(item.daysOfCover, 0)} days at the current pace`
        : ""
    }.`,
    action: "View stock",
  }),
  NEGATIVE_MATERIAL: (item) => ({
    title: `${item.subjectName} shows negative stock`,
    detail: `Recorded balance is ${FormatKg(item.quantityKg)}. A stock count will correct it.`,
    action: "Count stock",
  }),
  NO_PRICE: (item) => ({
    title: `${item.subjectName} has no price`,
    detail: "It can't be sold until a price is set.",
    action: "Set price",
  }),
  NO_COST: (item) => ({
    title: `${item.subjectName} has no cost`,
    detail: "Its sales are left out of profit and margin.",
    action: "Set cost",
  }),
  STALE_DEBT: (item) => ({
    title: `${item.subjectName} owes ${FormatMoney(item.amount)}`,
    detail: item.lastPaymentAt
      ? `No payment since ${FormatDate(item.lastPaymentAt)}.`
      : "No payment on record in over 30 days.",
    action: "Open account",
  }),
};

export function AttentionList({
  items,
  limit,
}: {
  items: AttentionItemDTO[];
  limit?: number;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center">
        <CheckCircleIcon
          weight="fill"
          className="size-7"
          style={{ color: ToneColor("good") }}
        />
        <p className="text-sm font-medium">All clear</p>
        <p className="text-xs text-muted-foreground">
          Nothing needs your attention right now.
        </p>
      </div>
    );
  }

  const shown = limit ? items.slice(0, limit) : items;

  return (
    <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
      {shown.map((item) => {
        const severity = SEVERITY_META[item.severity];
        const SeverityIcon = severity.icon;
        const copy = COPY[item.kind](item);
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className="group flex items-start gap-3 px-3.5 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
            >
              <SeverityIcon
                weight="fill"
                className="mt-0.5 size-4 shrink-0"
                style={{ color: ToneColor(severity.tone) }}
                aria-label={severity.label}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium leading-snug">
                  {copy.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {copy.detail}
                </span>
              </span>
              <span className="mt-0.5 flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                {copy.action}
                <CaretRightIcon className="size-3" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
