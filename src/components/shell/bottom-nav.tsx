"use client";

import { DotsThreeIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu, GetInitials } from "@/components/shell/account-menu";
import {
  ACCOUNT_TRIGGER_TOUR_ID,
  NavTourId,
} from "@/components/tour/tour-elements";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-config";

interface BottomNavProps {
  user: AppUser;
  navItems: NavItem[];
}

// Direct, always-visible nav slots before the rest collapse into "More" —
// chosen so every slot (primary items + More + the account tab) stays a
// comfortable, equal-width touch target at a 375px viewport rather than
// shrinking indefinitely as more roles/nav items are added. See
// docs/DECISIONS.md for why this replaced the original horizontally-
// scrolling row: a swipe-to-discover bottom bar hid most of a 13-item
// Manager nav with no visual cue that there was more, which is worse than
// a labeled, always-visible "More" the way this app's other overflow
// menus already work.
const PRIMARY_NAV_COUNT = 3;

function IsActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav({ user, navItems }: BottomNavProps) {
  const pathname = usePathname();

  // Only collapse into "More" once there's more than one item to gain by
  // it — a role with 4 or fewer nav items just shows them all directly,
  // same as before.
  const hasOverflow = navItems.length > PRIMARY_NAV_COUNT + 1;
  const primaryItems = hasOverflow
    ? navItems.slice(0, PRIMARY_NAV_COUNT)
    : navItems;
  const overflowItems = hasOverflow ? navItems.slice(PRIMARY_NAV_COUNT) : [];
  const isOverflowActive = overflowItems.some((item) =>
    IsActive(pathname, item.href),
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-sidebar md:hidden">
      {primaryItems.map((item) => {
        const isActive = IsActive(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            data-tour={NavTourId(item.href)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] transition-colors",
              isActive
                ? "text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-5" weight={isActive ? "fill" : "regular"} />
            {item.label}
          </Link>
        );
      })}
      {hasOverflow && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] transition-colors",
                isOverflowActive
                  ? "text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
              )}
            >
              <DotsThreeIcon
                className="size-5"
                weight={isOverflowActive ? "bold" : "regular"}
              />
              More
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="mb-1">
            {overflowItems.map((item) => {
              const isActive = IsActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link
                    href={item.href}
                    data-tour={NavTourId(item.href)}
                    className={isActive ? "text-sidebar-primary" : undefined}
                  >
                    <Icon weight={isActive ? "fill" : "regular"} />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <AccountMenu user={user} align="end" side="top">
        <button
          type="button"
          data-tour={ACCOUNT_TRIGGER_TOUR_ID}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 border-l border-border px-1 py-2 text-[10px] text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground"
        >
          <Avatar className="size-5">
            <AvatarFallback className="text-[9px]">
              {GetInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          You
        </button>
      </AccountMenu>
    </nav>
  );
}
