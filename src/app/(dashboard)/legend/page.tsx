import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { LegendContent } from "@/features/legend/components/legend-content";
import { LEGEND_SECTIONS } from "@/features/legend/legend-sections";

// Static reference page, no permission gate beyond the shared
// (dashboard)/layout.tsx's plain signed-in check — see
// docs/epics/19-legend-walkthrough-reference.md. No session read happens in
// this page's own body, so it doesn't need `export const instant = false;`
// (AGENTS.md's rule only applies to a page/layout whose own body calls a
// session-reading function).
export default function LegendPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader description="App terminology and ledger logic, mapped back to the paper Daily Stock Report factory staff already use." />
      <nav aria-label="Table of contents" className="flex flex-col gap-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {LEGEND_SECTIONS.map((section) => (
            <li key={section.id}>
              <Link
                href={`#${section.id}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {section.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <LegendContent />
    </div>
  );
}
