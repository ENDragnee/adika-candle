import {
  CheckCircleIcon,
  CircleDashedIcon,
  type Icon,
  MinusCircleIcon,
  StackIcon,
  WarningIcon,
  WarningOctagonIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { type Tone, ToneBadge } from "@/components/ui/tone-badge";
import type { StockStatus } from "../stock-status";

// Display metadata for the shared stock statuses
// (src/features/stock/stock-status.ts) — every screen that shows a stock
// status uses this, so a status always has the same name, icon, color,
// and explanation everywhere.
export const STOCK_STATUS_META: Record<
  StockStatus,
  { label: string; icon: Icon; tone: Tone; description: string }
> = {
  NEGATIVE: {
    label: "Negative",
    icon: MinusCircleIcon,
    tone: "critical",
    description:
      "More was sold than was recorded as accepted. Do a stock count to correct it.",
  },
  OUT_OF_STOCK: {
    label: "Out of stock",
    icon: XCircleIcon,
    tone: "critical",
    description: "Nothing on hand.",
  },
  CRITICAL: {
    label: "Critical",
    icon: WarningOctagonIcon,
    tone: "serious",
    description: "Below half of the low-stock alert level.",
  },
  LOW: {
    label: "Low",
    icon: WarningIcon,
    tone: "warning",
    description: "Below the low-stock alert level.",
  },
  HEALTHY: {
    label: "Healthy",
    icon: CheckCircleIcon,
    tone: "good",
    description: "At or comfortably above the alert level.",
  },
  OVERSTOCKED: {
    label: "Overstocked",
    icon: StackIcon,
    tone: "info",
    description: "More than three times the alert level.",
  },
  UNTRACKED: {
    label: "Not tracked",
    icon: CircleDashedIcon,
    tone: "neutral",
    description:
      "In stock, but no low-stock alert level is set, so we can't say if it's low.",
  },
};

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const meta = STOCK_STATUS_META[status];
  return (
    <ToneBadge tone={meta.tone} icon={meta.icon} title={meta.description}>
      {meta.label}
    </ToneBadge>
  );
}
