"use client";

import { usePathname } from "next/navigation";
import type { AppUser } from "@/lib/auth";
import type { NavItem } from "./nav-config";
import { usePageHeaderStore } from "./page-header-store";

// Persistent header above every page's own content — the page name (so the
// person always knows where they are) plus a welcome greeting. The title
// defaults to whichever nav item matches the current route (same
// active-route logic AppShell/BottomNav already use for highlighting), but
// a page can override the title and/or add a description via
// usePageHeader()/<PageHeader /> for something more specific (e.g. a
// product's own name instead of the generic "Products" label, or a one-line
// explainer that used to live in the page's own now-removed inline heading).
//
// The left side is deliberately just a title container today, not a
// breadcrumb trail — but it's the one place a future Breadcrumbs component
// would slot in without restructuring anything else in the shell.
function DeriveDefaultTitle(pathname: string, navItems: NavItem[]): string {
  const activeItem = navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return activeItem?.label ?? "Adika Candle";
}

export function TopBar({
  user,
  navItems,
}: {
  user: AppUser;
  navItems: NavItem[];
}) {
  const pathname = usePathname();
  const overrideTitle = usePageHeaderStore((state) => state.title);
  const description = usePageHeaderStore((state) => state.description);
  const title = overrideTitle ?? DeriveDefaultTitle(pathname, navItems);
  const firstName = user.name.split(" ")[0];

  return (
    <header
      data-tour="topbar"
      className="flex items-center justify-between gap-4 border-b border-border bg-background px-4 py-3 md:px-6"
    >
      <div className="flex min-w-0 flex-col">
        {/* The sidebar already carries the brand on desktop (md+); on
            mobile the sidebar is hidden, so this is the only brand mark
            left — replaces the old standalone MobileHeader bar. */}
        <span className="text-xs font-semibold text-muted-foreground md:hidden">
          Adika Candle
        </span>
        <h1 className="truncate text-lg font-semibold text-foreground">
          {title}
        </h1>
        {description && (
          <p className="truncate text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <p className="shrink-0 text-sm text-muted-foreground">
        Welcome back,{" "}
        <span className="font-medium text-foreground">{firstName}</span>
      </p>
    </header>
  );
}
