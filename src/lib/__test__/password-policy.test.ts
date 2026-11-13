import { describe, expect, it } from "vitest";
import { FailedPasswordRules } from "../password-policy";

const ids = (password: string, personal?: string[]) =>
  FailedPasswordRules(password, { personal }).map((rule) => rule.id);

describe("password policy", () => {
  it("accepts a reasonable password", () => {
    expect(ids("Candle-Factory-42")).toEqual([]);
  });

  it("flags each weakness", () => {
    expect(ids("short1A")).toContain("length");
    expect(ids("alllowercase1")).toContain("mixed-case");
    expect(ids("NoNumbersHere")).toContain("number");
    expect(ids("Password123")).toContain("not-common");
  });

  it("rejects passwords containing the person's own details", () => {
    expect(ids("Merkato2026!", ["Merkato Test", "merkato"])).toContain(
      "not-personal",
    );
  });
});
