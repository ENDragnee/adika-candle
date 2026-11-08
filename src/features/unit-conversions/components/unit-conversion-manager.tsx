"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { TableContainer } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateUnitConversion,
  useDeactivateUnitConversion,
  useUnitConversions,
  useUpdateUnitConversion,
} from "../hooks/use-unit-conversions";
import type { UnitConversionDTO } from "../validators/unit-conversion.schema";

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
      className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3"
    >
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <label htmlFor="new-unit-name" className="text-sm font-medium">
          Unit name
        </label>
        <Input
          id="new-unit-name"
          value={unitName}
          onChange={(event) => setUnitName(event.target.value)}
          placeholder="CARTON"
          required
        />
      </div>
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <label htmlFor="new-unit-ratio" className="text-sm font-medium">
          Ratio to KG
        </label>
        <Input
          id="new-unit-ratio"
          type="number"
          step="any"
          min="0"
          value={ratioToKg}
          onChange={(event) => setRatioToKg(event.target.value)}
          required
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
      <TableRow>
        <TableCell>{unit.unitName}</TableCell>
        <TableCell>
          <Input
            type="number"
            step="any"
            min="0"
            value={ratioToKg}
            onChange={(event) => setRatioToKg(event.target.value)}
          />
        </TableCell>
        <TableCell className="text-muted-foreground">
          {unit.isActive ? "Active" : "Inactive"}
        </TableCell>
        <TableCell className="flex gap-2">
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
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>{unit.unitName}</TableCell>
      <TableCell className="text-muted-foreground">{unit.ratioToKg}</TableCell>
      <TableCell>{unit.isActive ? "Active" : "Inactive"}</TableCell>
      <TableCell className="flex gap-2">
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
      </TableCell>
    </TableRow>
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
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="bg-muted/50">Unit</TableHead>
                <TableHead className="bg-muted/50">Ratio to KG</TableHead>
                <TableHead className="bg-muted/50">Status</TableHead>
                <TableHead className="bg-muted/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units?.length ? (
                units.map((unit) => (
                  <UnitConversionRow key={unit.id} unit={unit} />
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No unit conversions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
