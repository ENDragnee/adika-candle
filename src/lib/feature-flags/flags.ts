// Feature flags, evaluated through OpenFeature. Client-safe: keys,
// variants and parsing only. The server reads them in ./server.ts (backed
// by the SystemSetting table, changed by the Admin in /manager/system);
// the browser gets the server's values through FeatureFlagProvider. The
// browser's copy only drives the UI — the server re-reads every flag
// before acting on it. See docs/DECISIONS.md, "Sale unit mode flag".

// Which units a sale may be entered in. BOTH lets one sale mix them
// (3 cartons + 12 packets). Stock accept stays cartons-only regardless.
export const SALE_UNIT_MODE_FLAG = "sale-unit-mode";
export const SALE_UNIT_MODES = ["CARTON", "PACKET", "BOTH"] as const;
export type SaleUnitMode = (typeof SALE_UNIT_MODES)[number];
export const DEFAULT_SALE_UNIT_MODE: SaleUnitMode = "CARTON";

export const SALE_UNIT_MODE_META: Record<
  SaleUnitMode,
  { label: string; description: string }
> = {
  CARTON: {
    label: "Cartons only",
    description: "Sales are entered in whole or part cartons.",
  },
  PACKET: {
    label: "Packets only",
    description: "Sales are entered in packets (30 to a carton).",
  },
  BOTH: {
    label: "Cartons and packets",
    description: "One sale can mix cartons and loose packets.",
  },
};

// An unknown or missing value never widens what can be sold.
export function ParseSaleUnitMode(value: unknown): SaleUnitMode {
  return SALE_UNIT_MODES.includes(value as SaleUnitMode)
    ? (value as SaleUnitMode)
    : DEFAULT_SALE_UNIT_MODE;
}

export function SaleModeAllows(
  mode: SaleUnitMode,
  quantity: { cartons: number; packets: number },
): boolean {
  if (mode === "CARTON") return quantity.packets === 0;
  if (mode === "PACKET") return quantity.cartons === 0;
  return true;
}
