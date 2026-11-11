"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Sits between (dashboard)/layout.tsx and the page that crashed — AppShell
// (sidebar/TopBar/BottomNav) stays mounted and fully usable, only the main
// content area is replaced, so a rendering bug on one page doesn't strand
// the user with no way to navigate elsewhere. See docs/DECISIONS.md.
export default function DashboardError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="max-w-sm">
        <CardHeader className="items-center text-center">
          <WarningCircleIcon className="size-10 text-destructive" />
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            This page ran into a problem loading. Try again — if it keeps
            happening, let a manager know.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => retry()}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
