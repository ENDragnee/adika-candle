// Products the owner wants listed first on Sales and Products, in this
// order. These are exact product NAMES — "Plus" is the product called
// Plus, not the PLUS carton size, and "Color" is the product called
// Color. Matched case-insensitively after trimming, never as a prefix
// ("Marel 7kg" is not Marel). Everything else follows in the list's own
// order. Client-safe. See docs/DECISIONS.md (2026-11-27, "Pinned
// products").
export const PINNED_PRODUCT_NAMES = ["Marel", "Plus", "Color"] as const;

function NormalizeName(name: string): string {
  return name.trim().toLowerCase();
}

const PINNED_RANKS = new Map<string, number>(
  PINNED_PRODUCT_NAMES.map((name, index) => [NormalizeName(name), index]),
);

// 0-based position in PINNED_PRODUCT_NAMES, or null if not pinned.
export function PinnedProductRank(name: string): number | null {
  return PINNED_RANKS.get(NormalizeName(name)) ?? null;
}

// Stable: pinned products first by rank, the rest keep their order.
export function SortPinnedFirst<T extends { name: string }>(items: T[]): T[] {
  const rank = (item: T) =>
    PinnedProductRank(item.name) ?? PINNED_PRODUCT_NAMES.length;
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index)
    .map(({ item }) => item);
}

export interface PinnedPageWindow {
  // Slice of the (sorted) pinned rows that falls on this page.
  pinnedStart: number;
  pinnedEnd: number;
  // Skip/take for the query over the non-pinned rows.
  restSkip: number;
  restTake: number;
}

// The list is pinned rows (pinnedCount of them) followed by the rest.
// Given the page's skip/take over that combined list, says which pinned
// rows and which rest rows land on the page.
export function PinnedPageWindow(
  skip: number,
  take: number,
  pinnedCount: number,
): PinnedPageWindow {
  const pinnedStart = Math.min(skip, pinnedCount);
  const pinnedEnd = Math.min(skip + take, pinnedCount);
  return {
    pinnedStart,
    pinnedEnd,
    restSkip: Math.max(0, skip - pinnedCount),
    restTake: take - (pinnedEnd - pinnedStart),
  };
}
