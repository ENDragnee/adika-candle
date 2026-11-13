// Table-of-contents entries for the Legend page — anchor targets into
// legend-content.tsx's sections. Kept as a small standalone data array (not
// derived from the content component itself) since the TOC is read once at
// render time and the content is a long single scroll, not a tab/routing
// system — see docs/epics/19-legend-walkthrough-reference.md.
export interface LegendSection {
  id: string;
  label: string;
}

export const LEGEND_SECTIONS: LegendSection[] = [
  { id: "daily-stock-report", label: "Daily Stock Report columns" },
  { id: "sales", label: "Sales, voids, and overselling" },
  { id: "loan-balance", label: "Customer balances" },
  { id: "ledger-entries", label: "Stock history entries" },
  { id: "unit-conversions", label: "Unit conversions" },
  { id: "stock-health", label: "Stock statuses" },
  { id: "roles", label: "Manager vs Inventory Manager" },
];
