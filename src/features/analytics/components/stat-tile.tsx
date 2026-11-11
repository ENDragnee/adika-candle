"use client";

import { useCountUp } from "@/components/motion/use-count-up";
import { Card, CardContent } from "@/components/ui/card";

// Epic 16/17: a stat tile whose number counts up from 0 on initial render,
// via the shared useCountUp hook (writes to the span's textContent inside
// requestAnimationFrame, not React state — see
// src/components/motion/use-count-up.ts).
export function StatTile({
  label,
  value,
  format = (n: number) => Math.round(n).toLocaleString(),
}: {
  label: string;
  value: number;
  format?: (value: number) => string;
}) {
  const ref = useCountUp(value, { format });

  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span ref={ref} className="text-2xl font-semibold tabular-nums">
          {format(value)}
        </span>
      </CardContent>
    </Card>
  );
}
