"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import type { AppUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-config";

interface AppShellProps {
  user: AppUser;
  navItems: NavItem[];
  children: React.ReactNode;
}

export function AppShell({ user, navItems, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="px-4 py-3 text-sm font-semibold text-sidebar-foreground">
          Adika Candle
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-none px-2 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="text-sm text-muted-foreground">
            {user.name} ·{" "}
            <span className="font-medium text-foreground">{user.role}</span>
          </div>
          <SignOutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
