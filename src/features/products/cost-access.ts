// Who may see what a product costs to make, and everything derived from it
// (margin, per-sale cost and profit). Price is not covered: anyone with
// product:read sees it. The Inventory Manager doesn't hold this, so the
// API leaves cost out of their responses (`currentCost`,
// `costPerKgAtSale` come back null) and the UI hides the cost and margin
// figures. See docs/DECISIONS.md (2026-11-27). Client-safe — no server
// imports.
export const COST_PERMISSION = "product:cost";

export function CanSeeCost(permissions: readonly string[] | undefined) {
  return permissions?.includes(COST_PERMISSION) ?? false;
}
