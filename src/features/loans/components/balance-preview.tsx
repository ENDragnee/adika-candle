import { ArrowRightIcon } from "@phosphor-icons/react";
import { DescribeLoanBalance } from "@/lib/format";

function BalanceText({ balance }: { balance: number }) {
  const described = DescribeLoanBalance(balance);
  return (
    <span className="flex flex-col">
      <span className="text-xs text-muted-foreground">{described.label}</span>
      <span className="font-semibold tabular-nums">
        {described.direction === "SETTLED" ? "—" : described.amount}
      </span>
    </span>
  );
}

// "Owes you ETB 500 → Owes you ETB 300" under a loan form (Epic 21), so the
// person sees what the entry will do before saving — the balance sign
// convention (docs/DECISIONS.md) never has to be understood to use it.
export function BalancePreview({
  current,
  delta,
}: {
  current: number;
  delta: number | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
      <BalanceText balance={current} />
      {delta !== null && delta !== 0 && (
        <>
          <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
          <BalanceText balance={current + delta} />
        </>
      )}
    </div>
  );
}
