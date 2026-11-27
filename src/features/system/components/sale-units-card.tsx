"use client";

import { PackageIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ToneBadge } from "@/components/ui/tone-badge";
import {
  SALE_UNIT_MODE_META,
  SALE_UNIT_MODES,
  type SaleUnitMode,
} from "@/lib/feature-flags/flags";
import { cn } from "@/lib/utils";
import { useUpdateSystemSettings } from "../hooks/use-system";
import type { SystemSettings } from "../validators/system.schema";
import { SettingCard } from "./setting-card";

// The sale-unit-mode feature flag: which units sales may be entered in.
// Saving refreshes the layout so this tab's flag provider picks it up;
// other open tabs see it on their next navigation, and the sales API
// enforces it either way.
export function SaleUnitsCard({
  settings,
}: {
  settings: SystemSettings["features"];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<SaleUnitMode>(settings.saleUnitMode);
  const update = useUpdateSystemSettings("Sale units saved", () =>
    router.refresh(),
  );

  return (
    <SettingCard
      icon={PackageIcon}
      title="Sale units"
      description="Which units staff enter sales in. Earlier sales keep showing the unit they were sold in. Producing stock stays in cartons."
      status={
        <ToneBadge tone="info">
          {SALE_UNIT_MODE_META[settings.saleUnitMode].label}
        </ToneBadge>
      }
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Sell in</legend>
        {SALE_UNIT_MODES.map((option) => (
          <label
            key={option}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
              mode === option ? "border-primary bg-muted/50" : "border-border",
            )}
          >
            <input
              type="radio"
              name="sale-unit-mode"
              value={option}
              checked={mode === option}
              onChange={() => setMode(option)}
              className="mt-0.5 accent-primary"
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium">
                {SALE_UNIT_MODE_META[option].label}
              </span>
              <span className="text-xs text-muted-foreground">
                {SALE_UNIT_MODE_META[option].description}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <div>
        <Button
          size="sm"
          loading={update.isPending}
          disabled={mode === settings.saleUnitMode}
          onClick={() => update.mutate({ features: { saleUnitMode: mode } })}
        >
          Save
        </Button>
      </div>
    </SettingCard>
  );
}
