"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useCreateUnitConversion,
  useDeactivateUnitConversion,
  useUnitConversions,
  useUpdateUnitConversion,
} from "../hooks/use-unit-conversions";
import type { UnitConversionDTO } from "../validators/unit-conversion.schema";

const inputClassName =
  "h-8 w-full rounded-none border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

function CreateUnitConversionForm() {
  const [unitName, setUnitName] = useState("");
  const [ratioToKg, setRatioToKg] = useState("");
  const createUnitConversion = useCreateUnitConversion();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await createUnitConversion.mutateAsync({
      unitName,
      ratioToKg: Number(ratioToKg),
    });

    setUnitName("");
    setRatioToKg("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 border border-border p-3"
    >
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <label htmlFor="new-unit-name" className="text-sm font-medium">
          Unit name
        </label>
        <input
          id="new-unit-name"
          value={unitName}
          onChange={(event) => setUnitName(event.target.value)}
          placeholder="CARTON"
          required
          className={inputClassName}
        />
      </div>
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <label htmlFor="new-unit-ratio" className="text-sm font-medium">
          Ratio to KG
        </label>
        <input
          id="new-unit-ratio"
          type="number"
          step="any"
          min="0"
          value={ratioToKg}
          onChange={(event) => setRatioToKg(event.target.value)}
          required
          className={inputClassName}
        />
      </div>
      <Button type="submit" disabled={createUnitConversion.isPending}>
        {createUnitConversion.isPending ? "Adding…" : "Add unit"}
      </Button>
      {createUnitConversion.isError && (
        <p className="w-full text-sm text-destructive">
          Couldn&apos;t create unit — check the name isn&apos;t already in use.
        </p>
      )}
    </form>
  );
}

function UnitConversionRow({ unit }: { unit: UnitConversionDTO }) {
  const [isEditing, setIsEditing] = useState(false);
  const [ratioToKg, setRatioToKg] = useState(unit.ratioToKg);
  const updateUnitConversion = useUpdateUnitConversion();
  const deactivateUnitConversion = useDeactivateUnitConversion();

  async function handleSave() {
    await updateUnitConversion.mutateAsync({
      id: unit.id,
      input: { ratioToKg: Number(ratioToKg) },
    });
    setIsEditing(false);
  }

  function handleCancel() {
    setRatioToKg(unit.ratioToKg);
    setIsEditing(false);
  }

  async function handleToggleActive() {
    if (unit.isActive) {
      await deactivateUnitConversion.mutateAsync(unit.id);
    } else {
      await updateUnitConversion.mutateAsync({
        id: unit.id,
        input: { isActive: true },
      });
    }
  }

  if (isEditing) {
    return (
      <tr className="border-b border-border">
        <td className="p-2 text-sm">{unit.unitName}</td>
        <td className="p-2">
          <input
            type="number"
            step="any"
            min="0"
            value={ratioToKg}
            onChange={(event) => setRatioToKg(event.target.value)}
            className={inputClassName}
          />
        </td>
        <td className="p-2 text-sm text-muted-foreground">
          {unit.isActive ? "Active" : "Inactive"}
        </td>
        <td className="flex gap-2 p-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateUnitConversion.isPending}
          >
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border">
      <td className="p-2 text-sm">{unit.unitName}</td>
      <td className="p-2 text-sm text-muted-foreground">{unit.ratioToKg}</td>
      <td className="p-2 text-sm">{unit.isActive ? "Active" : "Inactive"}</td>
      <td className="flex gap-2 p-2">
        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
          Edit
        </Button>
        <Button
          size="sm"
          variant={unit.isActive ? "destructive" : "secondary"}
          onClick={handleToggleActive}
          disabled={
            deactivateUnitConversion.isPending || updateUnitConversion.isPending
          }
        >
          {unit.isActive ? "Deactivate" : "Activate"}
        </Button>
      </td>
    </tr>
  );
}

export function UnitConversionManager() {
  const { data: units, isLoading } = useUnitConversions();

  return (
    <div className="flex flex-col gap-4">
      <CreateUnitConversionForm />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading units…</p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-2 text-sm font-medium">Unit</th>
                <th className="p-2 text-sm font-medium">Ratio to KG</th>
                <th className="p-2 text-sm font-medium">Status</th>
                <th className="p-2 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {units?.length ? (
                units.map((unit) => (
                  <UnitConversionRow key={unit.id} unit={unit} />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="p-3 text-center text-sm text-muted-foreground"
                  >
                    No unit conversions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
