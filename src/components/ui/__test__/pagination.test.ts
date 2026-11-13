import { describe, expect, it } from "vitest";
import { PageWindow } from "../pagination";

describe("PageWindow", () => {
  it("lists every page when there are few", () => {
    expect(PageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses gaps around the current page", () => {
    expect(PageWindow(6, 12)).toEqual([1, "…", 5, 6, 7, "…", 12]);
  });

  it("keeps the edges without a gap when adjacent", () => {
    expect(PageWindow(2, 12)).toEqual([1, 2, 3, "…", 12]);
  });
});
