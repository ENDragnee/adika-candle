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

// Catches a crash anywhere outside (dashboard)/ — the landing page,
// sign-in, Legend's own segment is covered by (dashboard)/error.tsx
// instead since it lives under that layout. This still renders inside the
// normal root layout (ThemeProvider, fonts, globals.css all apply) —
// unlike global-error.tsx, which replaces the root layout entirely and
// needs its own copy of all of that. See docs/DECISIONS.md.
export default function RootError({
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
    <div className="flex min-h-screen flex-1 items-center justify-center p-6">
      <Card className="max-w-sm">
        <CardHeader className="items-center text-center">
          <WarningCircleIcon className="size-10 text-destructive" />
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            This page ran into a problem loading. Try again, or head back to the
            sign-in page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => retry()}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/auth/sign-in">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
