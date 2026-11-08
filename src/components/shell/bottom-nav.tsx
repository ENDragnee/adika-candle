"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu, GetInitials } from "@/components/shell/account-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { AppUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-config";

interface BottomNavProps {
  user: AppUser;
  navItems: NavItem[];
}

// Mobile-only bottom tab bar: nav items scroll horizontally (there are up
// to 10 of them for Manager — more than fit on a phone at once), while
// the account avatar is a separate, non-scrolling tab pinned at the end —
// always reachable without swiping, same as YouTube's "You" tab. See
// docs/DECISIONS.md for why this was chosen over a fixed-4-items +
// "More" sheet (no Sheet/Drawer primitive exists yet).
export function BottomNav({ user, navItems }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-sidebar md:hidden">
      <div className="flex flex-1 overflow-x-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-16 shrink-0 flex-col items-center justify-center gap-0.5 px-3 py-2 text-[10px] whitespace-nowrap transition-colors",
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
      </div>
      <AccountMenu user={user} align="end" side="top">
        <button
          type="button"
          className="flex min-w-16 shrink-0 flex-col items-center justify-center gap-0.5 border-l border-border px-3 py-2 text-[10px] text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground"
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
