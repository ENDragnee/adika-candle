import { describe, expect, it } from "vitest";
import { IsWithinReach, MissingPermissions } from "../access-rules";

const MANAGER = ["user:manage", "role:manage", "stock:read"];
const ADMIN = [...MANAGER, "session:manage"];

describe("access containment rules", () => {
  it("lets an actor reach any subset of their own permissions", () => {
    expect(IsWithinReach(MANAGER, ["stock:read"])).toBe(true);
    expect(IsWithinReach(MANAGER, [])).toBe(true);
    expect(IsWithinReach(MANAGER, MANAGER)).toBe(true);
  });

  it("keeps a Manager from reaching the Admin role", () => {
    expect(IsWithinReach(MANAGER, ADMIN)).toBe(false);
    expect(MissingPermissions(MANAGER, ADMIN)).toEqual(["session:manage"]);
  });

  it("lets the Admin reach every role", () => {
    expect(IsWithinReach(ADMIN, MANAGER)).toBe(true);
    expect(IsWithinReach(ADMIN, ADMIN)).toBe(true);
  });

  it("reports each missing permission once", () => {
    expect(
      MissingPermissions([], ["session:manage", "session:manage"]),
    ).toEqual(["session:manage"]);
  });
});
