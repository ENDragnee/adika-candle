import { describe, expect, it } from "vitest";
import { DecodeCursor, EncodeCursor } from "../server/cursor";

describe("activity cursor", () => {
  it("round-trips", () => {
    const cursor = {
      createdAt: new Date("2026-11-12T08:00:00.123Z"),
      id: "abc",
    };
    expect(DecodeCursor(EncodeCursor(cursor))).toEqual(cursor);
  });

  it("rejects garbage", () => {
    expect(DecodeCursor("not-a-cursor")).toBeNull();
  });
});
