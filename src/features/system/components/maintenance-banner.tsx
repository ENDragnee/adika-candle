import { WrenchIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

// Shown to the people still working during maintenance mode (Epic 24),
// so it never gets left on by accident.
export function MaintenanceBanner() {
  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm"
      style={{
        borderColor: "var(--color-status-warning)",
        background:
          "color-mix(in oklab, var(--color-status-warning) 12%, transparent)",
      }}
    >
      <WrenchIcon className="size-4 shrink-0" />
      <span className="flex-1">
        <span className="font-medium">Maintenance mode is on.</span> Only
        administrators can use the system right now.
      </span>
      <Link
        href="/manager/system"
        className="font-medium underline underline-offset-4"
      >
        Turn it off
      </Link>
    </div>
  );
}
