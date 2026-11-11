"use client";

import { CaretLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";
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
// Detail pages name their parent list (Epic 21), shown as a back link
// above the title.
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
  const parent = usePageHeaderStore((state) => state.parent);
  const title = overrideTitle ?? DeriveDefaultTitle(pathname, navItems);
  const firstName = user.name.split(" ")[0];

  return (
    <header
      data-tour="topbar"
      className="flex items-center justify-between gap-4 border-b border-border bg-background px-4 py-3 md:px-8 md:py-4"
    >
      <div className="flex min-w-0 flex-col">
        {/* The sidebar already carries the brand on desktop (md+); on
            mobile the sidebar is hidden, so this is the only brand mark
            left — replaces the old standalone MobileHeader bar. */}
        {parent ? (
          <Link
            href={parent.href}
            className="inline-flex w-fit items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <CaretLeftIcon className="size-3" weight="bold" />
            {parent.label}
          </Link>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground md:hidden">
            Adika Candle
          </span>
        )}
        <h1 className="truncate text-lg font-semibold text-foreground">
          {title}
        </h1>
        {description && (
          <p className="truncate text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {/* Hidden below md — on a narrow screen this greeting was eating
          into the title/description's own width (both need to share one
          row with it), forcing the description into a tighter truncation
          than it needed. The brand mark + title already orient the user;
          the greeting is a nice-to-have that desktop has room for. */}
      <p className="hidden shrink-0 text-sm text-muted-foreground md:block">
        Welcome back,{" "}
        <span className="font-medium text-foreground">{firstName}</span>
      </p>
    </header>
  );
}
