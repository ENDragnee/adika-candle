import type * as React from "react";
import { cn } from "@/lib/utils";

// Titled block inside a page (Epic 21): heading + optional one-line
// explanation on the left, actions (export, filters) on the right. Replaces
// the ad-hoc <h2>/<p> pairs each tab and dashboard section used to
// hand-roll at slightly different sizes.
export function Section({
  title,
  description,
  actions,
  children,
  className,
  id,
}: {
  id?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("flex scroll-mt-24 flex-col gap-3", className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
