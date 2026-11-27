import {
  ErrorCode,
  type JsonValue,
  OpenFeature,
  type Provider,
  type ResolutionDetails,
  StandardResolutionReasons,
} from "@openfeature/server-sdk";
import { GetSystemSettings } from "@/features/system/server/settings";
import {
  ParseSaleUnitMode,
  SALE_UNIT_MODE_FLAG,
  type SaleUnitMode,
} from "./flags";

// Server-side OpenFeature provider over the SystemSetting table (the
// `features` group), so the Admin can flip a flag from /manager/system
// without a redeploy. GetSystemSettings caches for 5 s and a save clears
// it, so a change is live here at once and on other instances within 5 s.
// Considered: flagd — a sidecar process and gRPC dependency for one flag.
export class SystemSettingsProvider implements Provider {
  readonly runsOn = "server";
  readonly metadata = { name: "system-settings" } as const;

  async resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
  ): Promise<ResolutionDetails<string>> {
    if (flagKey === SALE_UNIT_MODE_FLAG) {
      const { features } = await GetSystemSettings();
      return {
        value: features.saleUnitMode,
        variant: features.saleUnitMode,
        reason: StandardResolutionReasons.STATIC,
      };
    }
    return NotFound(flagKey, defaultValue);
  }

  async resolveBooleanEvaluation(flagKey: string, defaultValue: boolean) {
    return NotFound(flagKey, defaultValue);
  }

  async resolveNumberEvaluation(flagKey: string, defaultValue: number) {
    return NotFound(flagKey, defaultValue);
  }

  async resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
  ) {
    return NotFound(flagKey, defaultValue);
  }
}

function NotFound<T>(flagKey: string, defaultValue: T): ResolutionDetails<T> {
  return {
    value: defaultValue,
    reason: StandardResolutionReasons.ERROR,
    errorCode: ErrorCode.FLAG_NOT_FOUND,
    errorMessage: `Unknown flag "${flagKey}"`,
  };
}

let ready: Promise<void> | null = null;

function FlagClient() {
  ready ??= OpenFeature.setProviderAndWait(new SystemSettingsProvider());
  return ready.then(() => OpenFeature.getClient());
}

// The only way server code reads the sale unit mode — the client's copy
// is never trusted.
export async function GetSaleUnitMode(): Promise<SaleUnitMode> {
  const client = await FlagClient();
  const value = await client.getStringValue(SALE_UNIT_MODE_FLAG, "CARTON");
  return ParseSaleUnitMode(value);
}
