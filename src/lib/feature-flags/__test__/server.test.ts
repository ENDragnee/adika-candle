import { beforeEach, describe, expect, it, vi } from "vitest";

const settings = vi.hoisted(() => ({
  features: { saleUnitMode: "CARTON" as string },
}));

vi.mock("@/features/system/server/settings", () => ({
  GetSystemSettings: async () => settings,
}));

import { GetSaleUnitMode, SystemSettingsProvider } from "../server";

describe("SystemSettingsProvider", () => {
  beforeEach(() => {
    settings.features.saleUnitMode = "CARTON";
  });

  it("serves the stored sale unit mode", async () => {
    expect(await GetSaleUnitMode()).toBe("CARTON");
    settings.features.saleUnitMode = "BOTH";
    expect(await GetSaleUnitMode()).toBe("BOTH");
    settings.features.saleUnitMode = "PACKET";
    expect(await GetSaleUnitMode()).toBe("PACKET");
  });

  it("never widens on a bad stored value", async () => {
    settings.features.saleUnitMode = "EVERYTHING";
    expect(await GetSaleUnitMode()).toBe("CARTON");
  });

  it("reports unknown flags as not found", async () => {
    const result = await new SystemSettingsProvider().resolveStringEvaluation(
      "no-such-flag",
      "fallback",
    );
    expect(result.value).toBe("fallback");
    expect(result.errorCode).toBe("FLAG_NOT_FOUND");
  });
});
