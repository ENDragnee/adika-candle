import type { QueryClient } from "@tanstack/react-query";

// Every query whose numbers a stock/money movement can change. A sale, for
// example, moves stock, maybe a customer balance, and every analytics
// figure — before Epic 21 the Dashboard kept showing pre-sale numbers
// until its cache went stale. Query keys are prefix-matched.
const LEDGER_DEPENDENT_KEYS = [
  ["sales"],
  ["stock"],
  ["raw-materials"],
  ["customers"],
  ["loans"],
  ["analytics"],
] as const;

export function InvalidateLedgerQueries(queryClient: QueryClient) {
  for (const queryKey of LEDGER_DEPENDENT_KEYS) {
    queryClient.invalidateQueries({ queryKey: [...queryKey] });
  }
}
