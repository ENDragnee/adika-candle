import { ToneBadge } from "@/components/ui/tone-badge";
import { DescribeLoanBalance } from "@/lib/format";

// A customer balance in words (Epic 21): "Owes you ETB 225.00" / "Credit
// ETB 500.00" / "Settled" — never a bare signed number whose sign the
// reader has to decode (docs/DECISIONS.md, LoanAccount.balance sign).
export function LoanBalance({ balance }: { balance: string }) {
  const described = DescribeLoanBalance(balance);
  if (described.direction === "SETTLED") {
    return <ToneBadge tone="neutral">Settled</ToneBadge>;
  }
  return (
    <span className="inline-flex flex-col items-end leading-tight">
      <span className="font-semibold tabular-nums">{described.amount}</span>
      <span className="text-xs text-muted-foreground">
        {described.direction === "OWES" ? "owes you" : "credit with you"}
      </span>
    </span>
  );
}
