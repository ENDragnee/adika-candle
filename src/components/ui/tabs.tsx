"use client";

import { cn } from "cn";
import { Tabs as TabsPrimitive } from "radix-ui";
import type * as React from "react";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // Below `md`, the list fills the available width and each trigger
        // claims an equal share (see TabsTrigger's `flex-1`) — resizing to
        // the screen instead of hugging content and risking overflow, the
        // same "resize over scroll" call BottomNav makes for its own
        // mobile-width problem. `md+` reverts to the original hug-content,
        // left-aligned row (unaffected — this never overflowed at desktop
        // widths).
        "flex w-full items-center gap-1 border-b border-border md:inline-flex md:w-fit",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // `min-h-10` + `items-center justify-center text-center` keeps
        // every trigger the same height and its label centered whether it
        // wraps to one line ("Production") or two ("Stock Health") at
        // mobile widths — left-aligned single-line text (the old rule)
        // left wrapped labels looking ragged against their one-line
        // neighbors, with the active underline sitting at a different
        // height per trigger.
        "flex min-h-10 flex-1 items-center justify-center px-2 py-2 text-center text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground md:flex-none md:px-3",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
