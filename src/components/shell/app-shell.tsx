"use client";

import {
  CaretLeftIcon,
  CaretUpDownIcon,
  FlameIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { AccountMenu, GetInitials } from "@/components/shell/account-menu";
import {
  ACCOUNT_TRIGGER_TOUR_ID,
  NavTourId,
} from "@/components/tour/tour-elements";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AppUser } from "@/lib/auth";
import { HumanizeRoleName } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { BottomNav } from "./bottom-nav";
import { BuildNavItems, type NavItem } from "./nav-config";
import { TopBar } from "./top-bar";
import { useSidebarCollapsed } from "./use-sidebar-collapsed";

interface AppShellProps {
  user: AppUser;
  children: React.ReactNode;
}

// Collapsed, a nav item is icon-only — the label never disappears from
// the DOM (so there's nothing to re-mount/measure), it just collapses its
// own box to zero width in step with the sidebar's own width transition.
// A Tooltip stands in for the now-invisible label so the icon's meaning
// isn't lost; it's only mounted when collapsed, since an expanded item
// already shows its label inline and a tooltip there would be redundant.
function SidebarNavLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      data-tour={NavTourId(item.href)}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon
        className="size-[18px] shrink-0"
        weight={isActive ? "fill" : "regular"}
      />
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap transition-[width,opacity] duration-200 motion-reduce:transition-none",
          collapsed ? "w-0 opacity-0" : "w-full opacity-100",
        )}
      >
        {item.label}
      </span>
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function AppShell({ user, children }: AppShellProps) {
  const navItems = BuildNavItems(user.role, user.permissions);
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarCollapsed();

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "relative hidden h-screen shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-in-out motion-reduce:transition-none md:sticky md:top-0 md:flex",
          collapsed ? "md:w-16" : "md:w-60",
        )}
      >
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-6 -right-3 z-10 hidden size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground md:flex"
        >
          <CaretLeftIcon
            className={cn(
              "size-3.5 transition-transform duration-200 motion-reduce:transition-none",
              collapsed && "rotate-180",
            )}
          />
        </button>

        <div
          className={cn(
            "flex items-center gap-2.5 px-4 py-4",
            collapsed && "justify-center px-0",
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FlameIcon weight="fill" className="size-4" />
          </div>
          <span
            className={cn(
              "overflow-hidden text-sm font-semibold whitespace-nowrap text-sidebar-foreground transition-[width,opacity] duration-200 motion-reduce:transition-none",
              collapsed ? "w-0 opacity-0" : "w-full opacity-100",
            )}
          >
            Adika Candle
          </span>
        </div>

        <TooltipProvider delayDuration={200}>
          <nav className="flex-1 space-y-1 px-3">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <SidebarNavLink
                  key={item.href}
                  item={item}
                  isActive={isActive}
                  collapsed={collapsed}
                />
              );
            })}
          </nav>
        </TooltipProvider>

        <Separator />
        <AccountMenu
          user={user}
          align={collapsed ? "center" : "start"}
          side="top"
        >
          <button
            type="button"
            data-tour={ACCOUNT_TRIGGER_TOUR_ID}
            className={cn(
              "flex items-center gap-2.5 px-4 py-3.5 text-left transition-colors hover:bg-sidebar-accent",
              collapsed && "justify-center px-0",
            )}
          >
            <Avatar className="size-7 shrink-0">
              <AvatarFallback>{GetInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col overflow-hidden transition-[width,opacity] duration-200 motion-reduce:transition-none",
                collapsed ? "w-0 opacity-0" : "w-full opacity-100",
              )}
            >
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                {user.name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {user.role ? HumanizeRoleName(user.role) : "No role"}
              </span>
            </div>
            {!collapsed && (
              <CaretUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        </AccountMenu>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} navItems={navItems} />
        <main className="min-w-0 flex-1 p-4 pb-20 md:p-6 md:pb-8 lg:p-8">
          {children}
        </main>
        <BottomNav user={user} navItems={navItems} />
      </div>
    </div>
  );
}
