import { describe, expect, it } from "vitest";
import {
  PINNED_PRODUCT_NAMES,
  PinnedPageWindow,
  PinnedProductRank,
  SortPinnedFirst,
} from "../product-order";

describe("PinnedProductRank", () => {
  it("ranks Marel, Plus, Color in that order", () => {
    expect(PINNED_PRODUCT_NAMES).toEqual(["Marel", "Plus", "Color"]);
    expect(PinnedProductRank("Marel")).toBe(0);
    expect(PinnedProductRank("Plus")).toBe(1);
    expect(PinnedProductRank("Color")).toBe(2);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(PinnedProductRank("  marel ")).toBe(0);
    expect(PinnedProductRank("PLUS")).toBe(1);
    expect(PinnedProductRank("color")).toBe(2);
  });

  it("does not match prefixes, suffixes or variants", () => {
    expect(PinnedProductRank("Marel 7kg")).toBeNull();
    expect(PinnedProductRank("Plus Candle")).toBeNull();
    expect(PinnedProductRank("Colored")).toBeNull();
    expect(PinnedProductRank("Red Color")).toBeNull();
    expect(PinnedProductRank("Normal")).toBeNull();
    expect(PinnedProductRank("")).toBeNull();
  });
});

describe("SortPinnedFirst", () => {
  const names = (items: { name: string }[]) => items.map((item) => item.name);

  it("puts pinned products first in priority order, rest keep their order", () => {
    const items = [
      { name: "Alpha" },
      { name: "color" },
      { name: "Beta" },
      { name: "Plus" },
      { name: "Marel 7kg" },
      { name: "Marel" },
      { name: "Zeta" },
    ];
    expect(names(SortPinnedFirst(items))).toEqual([
      "Marel",
      "Plus",
      "color",
      "Alpha",
      "Beta",
      "Marel 7kg",
      "Zeta",
    ]);
  });

  it("keeps duplicate pinned names in their incoming order", () => {
    const items = [
      { name: "Plus", id: "b" },
      { name: "plus", id: "a" },
    ];
    expect(SortPinnedFirst(items).map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("does not mutate the input", () => {
    const items = [{ name: "Beta" }, { name: "Marel" }];
    SortPinnedFirst(items);
    expect(names(items)).toEqual(["Beta", "Marel"]);
  });
});

describe("PinnedPageWindow", () => {
  it("page 1 holds all pinned rows then fills with the rest", () => {
    expect(PinnedPageWindow(0, 20, 3)).toEqual({
      pinnedStart: 0,
      pinnedEnd: 3,
      restSkip: 0,
      restTake: 17,
    });
  });

  it("later pages skip past the pinned rows", () => {
    // Page 2 of 20: combined rows 20..39 = rest rows 17..36.
    expect(PinnedPageWindow(20, 20, 3)).toEqual({
      pinnedStart: 3,
      pinnedEnd: 3,
      restSkip: 17,
      restTake: 20,
    });
  });

  it("splits pinned rows across a page boundary", () => {
    // pageSize 2, page 2: pinned row 2, then rest row 0.
    expect(PinnedPageWindow(2, 2, 3)).toEqual({
      pinnedStart: 2,
      pinnedEnd: 3,
      restSkip: 0,
      restTake: 1,
    });
  });

  it("asks nothing of the rest when pinned rows fill the page", () => {
    expect(PinnedPageWindow(0, 2, 3)).toEqual({
      pinnedStart: 0,
      pinnedEnd: 2,
      restSkip: 0,
      restTake: 0,
    });
  });

  it("is a plain offset when nothing is pinned", () => {
    expect(PinnedPageWindow(40, 20, 0)).toEqual({
      pinnedStart: 0,
      pinnedEnd: 0,
      restSkip: 40,
      restTake: 20,
    });
  });
});
