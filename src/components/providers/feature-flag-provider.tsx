"use client";

import {
  InMemoryProvider,
  OpenFeature,
  OpenFeatureProvider,
} from "@openfeature/react-sdk";
import { useEffect, useState } from "react";
import {
  SALE_UNIT_MODE_FLAG,
  SALE_UNIT_MODES,
  type SaleUnitMode,
} from "@/lib/feature-flags/flags";

export const FLAG_DOMAIN = "app";

// Flag values as the server evaluated them for this render (dashboard
// layout → GetSaleUnitMode). Global flags, not per user.
export interface ServerFlags {
  saleUnitMode: SaleUnitMode;
}

function ToConfiguration(flags: ServerFlags) {
  return {
    [SALE_UNIT_MODE_FLAG]: {
      variants: Object.fromEntries(SALE_UNIT_MODES.map((mode) => [mode, mode])),
      defaultVariant: flags.saleUnitMode,
      disabled: false,
    },
  };
}

// Browser side of OpenFeature. An InMemoryProvider seeded with the
// server's values: it has no async initialize, so it's READY before the
// first render and SSR and hydration read the same value. During SSR the
// web-sdk singleton is shared across requests — harmless while every flag
// is global. After the Admin changes a flag, router.refresh() re-renders
// the layout with new values and putConfiguration re-renders the hooks.
export function FeatureFlagProvider({
  flags,
  children,
}: {
  flags: ServerFlags;
  children: React.ReactNode;
}) {
  const [provider] = useState(() => {
    const next = new InMemoryProvider(ToConfiguration(flags));
    OpenFeature.setProvider(FLAG_DOMAIN, next);
    return next;
  });

  const { saleUnitMode } = flags;
  useEffect(() => {
    void provider.putConfiguration(ToConfiguration({ saleUnitMode }));
  }, [provider, saleUnitMode]);

  return (
    <OpenFeatureProvider domain={FLAG_DOMAIN} suspendUntilReady={false}>
      {children}
    </OpenFeatureProvider>
  );
}
