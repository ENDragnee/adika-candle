"use client";

import {
  CaretDownIcon,
  CaretLeftIcon,
  CaretUpDownIcon,
  FlameIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { useEffect, useId } from "react";
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
import {
  BuildNavItems,
  GroupNavItems,
  type NavItem,
  type NavItemGroup,
} from "./nav-config";
import { TopBar } from "./top-bar";
import { ExpandNavGroup, useNavGroups } from "./use-nav-groups";
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

function IsActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// One sidebar section (Epic 25). A labelled group gets a heading that
// folds it away when there's more than one such group to choose between;
// "home" and "help" have no heading. With the sidebar folded to icons
// there's no room for headings, so groups become thin dividers and every
// item shows (an icon hidden in a folded group would be unreachable).
function SidebarNavGroup({
  group,
  pathname,
  sidebarCollapsed,
  collapsible,
  folded,
  onToggle,
}: {
  group: NavItemGroup;
  pathname: string;
  sidebarCollapsed: boolean;
  collapsible: boolean;
  folded: boolean;
  onToggle: () => void;
}) {
  const listId = useId();
  const items = group.items.map((item) => (
    <SidebarNavLink
      key={item.href}
      item={item}
      isActive={IsActive(pathname, item.href)}
      collapsed={sidebarCollapsed}
    />
  ));

  if (!group.label || sidebarCollapsed) {
    return (
      <div
        className={cn(
          "space-y-1",
          group.label && "mt-2 border-t border-sidebar-border pt-2",
        )}
      >
        {items}
      </div>
    );
  }

  const open = !collapsible || !folded;
  const headingClass =
    "flex w-full items-center justify-between rounded-md px-3 pt-4 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";

  return (
    <div>
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={listId}
          className={cn(
            headingClass,
            "transition-colors hover:text-sidebar-foreground",
          )}
        >
          {group.label}
          <CaretDownIcon
            className={cn(
              "size-3 transition-transform duration-200 motion-reduce:transition-none",
              !open && "-rotate-90",
            )}
          />
        </button>
      ) : (
        <p className={headingClass}>{group.label}</p>
      )}
      {/* grid-rows 0fr↔1fr animates to the content's natural height;
          `inert` keeps folded links out of the tab order. */}
      <div
        id={listId}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="space-y-1 overflow-hidden">{items}</div>
      </div>
    </div>
  );
}

export function AppShell({ user, children }: AppShellProps) {
  const navItems = BuildNavItems(user.role, user.permissions);
  const navGroups = GroupNavItems(navItems);
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarCollapsed();
  const { isCollapsed, toggle: toggleGroup } = useNavGroups();
  // Folding only helps when there's another group to keep in view.
  const collapsible =
    navGroups.filter((group) => group.label !== null).length > 1;

  // Arriving on a page inside a folded group (a link, the tour, the back
  // button) opens that group, so the current page is always visible.
  const activeGroupId = navGroups.find((group) =>
    group.items.some((item) => IsActive(pathname, item.href)),
  )?.id;
  // Runs on navigation only, so folding the current group still works.
  useEffect(() => {
    if (activeGroupId) ExpandNavGroup(activeGroupId);
  }, [activeGroupId]);

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
          <nav className="flex-1 overflow-y-auto px-3 pb-3">
            {navGroups.map((group) => (
              <SidebarNavGroup
                key={group.id}
                group={group}
                pathname={pathname}
                sidebarCollapsed={collapsed}
                collapsible={collapsible}
                folded={isCollapsed(group.id)}
                onToggle={() => toggleGroup(group.id)}
              />
            ))}
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
