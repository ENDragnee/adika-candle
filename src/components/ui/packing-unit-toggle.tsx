"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { useSaleUnitMode } from "@/lib/feature-flags/use-flags";
import {
  PACKING_UNIT_META,
  PACKING_UNITS,
  type PackingUnit,
} from "@/lib/packing";
import { cn } from "@/lib/utils";

// The unit reports and analytics show quantities in. Cartons by default,
// packets when sales are packets-only (sale-unit-mode flag) until the
// user picks one; one shared choice so switching to pieces on one tab
// carries to the next.
interface PackingUnitState {
  unit: PackingUnit;
  chosen: boolean;
  setUnit: (unit: PackingUnit) => void;
  setDefaultUnit: (unit: PackingUnit) => void;
}

export const usePackingUnit = create<PackingUnitState>((set) => ({
  unit: "CARTON",
  chosen: false,
  setUnit: (unit) => set({ unit, chosen: true }),
  setDefaultUnit: (unit) => set((state) => (state.chosen ? state : { unit })),
}));

export function PackingUnitToggle({ className }: { className?: string }) {
  const { unit, setUnit, setDefaultUnit } = usePackingUnit();
  const mode = useSaleUnitMode();

  useEffect(() => {
    setDefaultUnit(mode === "PACKET" ? "PACKET" : "CARTON");
  }, [mode, setDefaultUnit]);

  return (
    <fieldset
      className={cn(
        "inline-flex items-center rounded-lg border border-border p-0.5",
        className,
      )}
    >
      <legend className="sr-only">Show quantities in</legend>
      {PACKING_UNITS.map((option) => (
        <label
          key={option}
          className={cn(
            "cursor-pointer rounded-md px-2.5 py-1 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
            unit === option
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <input
            type="radio"
            name="packing-unit"
            value={option}
            className="sr-only"
            checked={unit === option}
            onChange={() => setUnit(option)}
          />
          {PACKING_UNIT_META[option].label}
        </label>
      ))}
    </fieldset>
  );
}
