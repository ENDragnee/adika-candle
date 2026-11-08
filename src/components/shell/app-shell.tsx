"use client";

import { CaretUpDownIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { AccountMenu, GetInitials } from "@/components/shell/account-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { AppUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { BottomNav } from "./bottom-nav";
import type { NavItem } from "./nav-config";
import { TopBar } from "./top-bar";

interface AppShellProps {
  user: AppUser;
  navItems: NavItem[];
  children: React.ReactNode;
}

export function AppShell({ user, navItems, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden h-screen shrink-0 flex-col border-r border-border bg-sidebar md:sticky md:top-0 md:flex md:w-56">
        <div className="px-4 py-3 text-sm font-semibold text-sidebar-foreground">
          Adika Candle
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon
                  className="size-4 shrink-0"
                  weight={isActive ? "fill" : "regular"}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Separator />
        <AccountMenu user={user} align="start" side="top">
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-sidebar-accent"
          >
            <Avatar className="size-7">
              <AvatarFallback>{GetInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                {user.name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {user.role}
              </span>
            </div>
            <CaretUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </AccountMenu>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} navItems={navItems} />
        <main className="min-w-0 flex-1 p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
        <BottomNav user={user} navItems={navItems} />
      </div>
    </div>
  );
}
