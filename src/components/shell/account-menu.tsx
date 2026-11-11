"use client";

import {
  CompassIcon,
  DesktopIcon,
  MoonIcon,
  SignOutIcon,
  SunIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type * as React from "react";
import { useEffect, useState } from "react";
import { useProductTour } from "@/components/tour/use-product-tour";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppUser } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: DesktopIcon },
] as const;

// Same compact segmented control the public (pre-auth) pages' standalone
// ThemeSwitcher presents, just inlined as one row inside the account
// dropdown instead of behind its own icon-trigger — three plain buttons
// (not DropdownMenuItem) so clicking one doesn't close the whole account
// menu the way every other row here does, letting someone flip between
// Light/Dark/System and actually see the result before moving on.
function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoids a hydration mismatch: the server has no access to the
  // client's saved theme, so the active segment only lights up after
  // mount — same guard the standalone ThemeSwitcher uses for its own
  // trigger icon.
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5">
      <span className="text-sm text-muted-foreground">Theme</span>
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = mounted && theme === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-label={option.label}
              aria-pressed={isActive}
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex size-7 items-center justify-center rounded-md transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" weight={isActive ? "fill" : "regular"} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GetInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AccountMenuProps {
  user: AppUser;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

// Trigger markup is passed in as `children` so the same menu can be
// rendered two ways: a full-width row at the bottom of the desktop
// sidebar, and a small pinned avatar tab in the mobile bottom bar. See
// docs/DECISIONS.md for why sign-out is inlined here instead of nesting
// <SignOutButton> (a <button> can't validly nest inside a Radix
// DropdownMenuItem, itself role=menuitem).
export function AccountMenu({
  user,
  children,
  align = "start",
  side = "top",
}: AccountMenuProps) {
  const router = useRouter();
  const startTour = useProductTour(user.role);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/auth/sign-in");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="min-w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{user.name}</span>
            <span className="text-muted-foreground">{user.role}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ThemeSelector />
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={startTour}>
          <CompassIcon />
          Take a tour
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}>
          <SignOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { GetInitials };
