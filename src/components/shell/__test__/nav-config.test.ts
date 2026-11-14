import { describe, expect, it } from "vitest";
import { BuildNavItems } from "../nav-config";

const labels = (role: string, permissions: string[]) =>
  BuildNavItems(role, permissions).map((item) => item.label);

describe("BuildNavItems", () => {
  it("hides Manager pages the role has no permission for", () => {
    const nav = labels("MANAGER", ["analytics:read", "sale:read"]);
    expect(nav).toEqual(["Dashboard", "Analytics", "Sales", "Legend"]);
  });

  it("adds Manager pages granted to another role, keeping Legend last", () => {
    const nav = labels("INVENTORY_MANAGER", [
      "stock:read",
      "sale:read",
      "analytics:read",
    ]);
    expect(nav).toContain("Analytics");
    // "Dashboard" already exists in the Inventory area — not duplicated.
    expect(nav.filter((label) => label === "Dashboard")).toHaveLength(1);
    expect(nav.at(-1)).toBe("Legend");
  });

  it("gives Admin the Manager area plus Sessions", () => {
    const nav = labels("ADMIN", ["analytics:read", "session:manage"]);
    expect(nav).toEqual(["Dashboard", "Analytics", "Sessions", "Legend"]);
  });

  it("hides Sessions from a Manager without session:manage", () => {
    expect(labels("MANAGER", ["user:manage", "role:manage"])).not.toContain(
      "Sessions",
    );
  });

  it("shows only Legend to a user with no permissions", () => {
    expect(labels("INVENTORY_MANAGER", [])).toEqual(["Legend"]);
  });
});
