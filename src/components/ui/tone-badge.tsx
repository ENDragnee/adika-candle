import type { Icon } from "@phosphor-icons/react";
import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// A status/kind badge (Epic 21) — e.g. stock status, ledger entry type,
// sale state. Color comes from the reserved --status-* tokens, but only on
// the tint and the icon: the label stays in text ink, because yellow or
// orange text fails contrast on a light surface (dataviz skill: "text
// wears text tokens"; status colors always ship with an icon + label).
export type Tone =
  | "good"
  | "warning"
  | "serious"
  | "critical"
  | "info"
  | "neutral";

const TONE_COLOR: Record<Tone, string> = {
  good: "var(--color-status-good)",
  warning: "var(--color-status-warning)",
  serious: "var(--color-status-serious)",
  critical: "var(--color-status-critical)",
  info: "var(--color-status-info)",
  neutral: "var(--color-muted-foreground)",
};

export function ToneColor(tone: Tone): string {
  return TONE_COLOR[tone];
}

export function ToneBadge({
  tone,
  icon: IconComponent,
  children,
  className,
  title,
}: {
  tone: Tone;
  icon?: Icon;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const color = TONE_COLOR[tone];
  return (
    <Badge
      variant="outline"
      title={title}
      className={cn("border-transparent text-foreground", className)}
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
      }}
    >
      {IconComponent && (
        <IconComponent
          data-icon="inline-start"
          weight="fill"
          style={{ color }}
        />
      )}
      {children}
    </Badge>
  );
}
