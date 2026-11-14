import { describe, expect, it } from "vitest";
import { BuildNavItems, GroupNavItems } from "../nav-config";

const labels = (role: string, permissions: string[]) =>
  BuildNavItems(role, permissions).map((item) => item.label);

describe("BuildNavItems", () => {
  it("hides Manager pages the role has no permission for", () => {
    const nav = labels("MANAGER", ["analytics:read", "sale:read"]);
    // Sidebar-group order: Dashboard, Daily work, Insights, …, Legend.
    expect(nav).toEqual(["Dashboard", "Sales", "Analytics", "Legend"]);
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

const groups = (role: string, permissions: string[]) =>
  GroupNavItems(BuildNavItems(role, permissions)).map((group) => group.label);

const ALL_MANAGER = [
  "analytics:read",
  "activity:read",
  "product:read",
  "category:manage",
  "stock:read",
  "raw-material:read",
  "sale:read",
  "customer:manage",
  "loan:manage",
  "user:manage",
  "role:manage",
  "unit-conversion:manage",
];

describe("GroupNavItems", () => {
  it("gives the Inventory Manager only Daily work between Dashboard and Legend", () => {
    expect(
      groups("INVENTORY_MANAGER", [
        "stock:read",
        "raw-material:read",
        "sale:read",
        "customer:read",
      ]),
    ).toEqual([null, "Daily work", null]);
  });

  it("adds management groups for the Manager, but not System", () => {
    expect(groups("MANAGER", ALL_MANAGER)).toEqual([
      null,
      "Daily work",
      "Insights",
      "Catalog",
      "People & access",
      null,
    ]);
  });

  it("adds the System group for the Admin", () => {
    expect(
      groups("ADMIN", [...ALL_MANAGER, "session:manage", "system:manage"]),
    ).toContain("System");
  });

  it("files a custom role's extra Manager pages under their own group", () => {
    const nav = GroupNavItems(
      BuildNavItems("CLERK", ["sale:read", "analytics:read"]),
    );
    expect(
      nav
        .find((group) => group.id === "insights")
        ?.items.map((item) => item.label),
    ).toEqual(["Analytics"]);
  });
});
