"use client";

import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  CompassIcon,
  CopyIcon,
  LockKeyIcon,
  WarningCircleIcon,
  WifiSlashIcon,
} from "@phosphor-icons/react";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ParseApiError } from "@/lib/get-error-message";

type Variant = "error" | "forbidden" | "not-found" | "offline";

const VARIANTS: Record<
  Variant,
  { icon: typeof WarningCircleIcon; title: string; description: string }
> = {
  error: {
    icon: WarningCircleIcon,
    title: "Something went wrong",
    description:
      "This page ran into a problem. Try again — if it keeps happening, copy the details and send them to whoever looks after the system.",
  },
  forbidden: {
    icon: LockKeyIcon,
    title: "You don't have access to this",
    description:
      "Your role doesn't include this page or action. A Manager can change that under Roles.",
  },
  "not-found": {
    icon: CompassIcon,
    title: "Page not found",
    description:
      "The page or record you're looking for doesn't exist — it may have been moved, or the link is wrong.",
  },
  offline: {
    icon: WifiSlashIcon,
    title: "Can't reach the server",
    description: "Check your connection, then try again.",
  },
};

// Classifies whatever an error boundary caught (Epic 22): an API error
// thrown by a failed first data load (React Query's throwOnError), a
// Server Component error (generic message + digest), or anything else.
function Describe(error: unknown): {
  variant: Variant;
  message: string | null;
  reference: string | null;
} {
  const info = ParseApiError(error, "");
  if (info.status !== null || info.code === "NETWORK") {
    const variant: Variant =
      info.code === "NETWORK"
        ? "offline"
        : info.status === 403
          ? "forbidden"
          : info.status === 404
            ? "not-found"
            : "error";
    return {
      variant,
      message: info.message || null,
      reference: info.requestId,
    };
  }
  const digest =
    error && typeof error === "object" && "digest" in error
      ? String((error as { digest: unknown }).digest)
      : null;
  return { variant: "error", message: null, reference: digest };
}

// The one "this page can't be shown" view, used by every error.tsx and
// not-found.tsx (Epic 22): what happened in plain words, a reference to
// quote, and ways forward (try again, go back, go home).
export function ErrorState({
  error,
  retry,
  variant: forcedVariant,
  homeHref = "/",
  fullScreen = false,
}: {
  error?: unknown;
  retry?: () => void;
  variant?: Variant;
  homeHref?: string;
  fullScreen?: boolean;
}) {
  const router = useRouter();
  const { reset } = useQueryErrorResetBoundary();
  const described = error
    ? Describe(error)
    : { variant: "error" as Variant, message: null, reference: null };
  const variant = forcedVariant ?? described.variant;
  const meta = VARIANTS[variant];
  const Icon = meta.icon;

  async function CopyDetails() {
    const report = [
      meta.title,
      described.message,
      described.reference && `Reference: ${described.reference}`,
      `Page: ${window.location.pathname}`,
      `Time: ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(report);
      toast.success("Error details copied");
    } catch {
      toast.error("Couldn't copy the details");
    }
  }

  return (
    <div
      className={
        fullScreen
          ? "flex min-h-screen items-center justify-center p-6"
          : "flex flex-1 items-center justify-center p-6 py-16"
      }
    >
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <Icon
            weight="duotone"
            className="size-7"
            style={{
              color:
                variant === "error"
                  ? "var(--color-status-critical)"
                  : "var(--color-muted-foreground)",
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-lg font-semibold">{meta.title}</h1>
          <p className="text-sm text-muted-foreground">
            {described.message && variant !== "not-found"
              ? described.message
              : meta.description}
          </p>
        </div>
        {described.reference && (
          <p className="text-xs text-muted-foreground">
            Reference <code>{described.reference}</code>
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {retry && variant !== "not-found" && variant !== "forbidden" && (
            <Button
              onClick={() => {
                // Clear React Query's error state too, or the retried
                // render would re-throw the same cached error.
                reset();
                retry();
              }}
            >
              <ArrowClockwiseIcon data-icon="inline-start" />
              Try again
            </Button>
          )}
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeftIcon data-icon="inline-start" />
            Go back
          </Button>
          <Button variant="ghost" asChild>
            <Link href={homeHref}>Home</Link>
          </Button>
          {variant === "error" && (
            <Button variant="ghost" onClick={CopyDetails}>
              <CopyIcon data-icon="inline-start" />
              Copy details
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
