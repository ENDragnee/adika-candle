"use client";

import { useStringFlagValue } from "@openfeature/react-sdk";
import {
  DEFAULT_SALE_UNIT_MODE,
  ParseSaleUnitMode,
  SALE_UNIT_MODE_FLAG,
  type SaleUnitMode,
} from "./flags";

// For the UI only — the sales API re-checks the mode on every sale.
export function useSaleUnitMode(): SaleUnitMode {
  return ParseSaleUnitMode(
    useStringFlagValue(SALE_UNIT_MODE_FLAG, DEFAULT_SALE_UNIT_MODE),
  );
}
