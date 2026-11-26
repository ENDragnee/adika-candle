"use client";

import { create } from "zustand";
import {
  PACKING_UNIT_META,
  PACKING_UNITS,
  type PackingUnit,
} from "@/lib/packing";
import { cn } from "@/lib/utils";

// The unit reports and analytics show quantities in. Cartons by default;
// one shared choice so switching to pieces on one tab carries to the next.
interface PackingUnitState {
  unit: PackingUnit;
  setUnit: (unit: PackingUnit) => void;
}

export const usePackingUnit = create<PackingUnitState>((set) => ({
  unit: "CARTON",
  setUnit: (unit) => set({ unit }),
}));

export function PackingUnitToggle({ className }: { className?: string }) {
  const { unit, setUnit } = usePackingUnit();

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
