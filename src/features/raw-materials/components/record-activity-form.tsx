"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { useRecordMaterialActivity } from "../hooks/use-material-activity";
import { useRawMaterials } from "../hooks/use-raw-materials";

const ACTIVITY_TYPES = [
  { value: "RECEIVED", label: "Received" },
  { value: "CONSUMED", label: "Consumed" },
] as const;

export function RecordActivityForm({ onSuccess }: { onSuccess: () => void }) {
  const { data: materialsResult, isLoading: materialsLoading } =
    useRawMaterials({ pageSize: MAX_PAGE_SIZE });
  const activeMaterials =
    materialsResult?.data.filter((material) => material.isActive) ?? [];

  const [materialId, setMaterialId] = useState("");
  const [type, setType] = useState<"RECEIVED" | "CONSUMED">("RECEIVED");
  const [quantityKg, setQuantityKg] = useState("");
  const [note, setNote] = useState("");
  const recordActivity = useRecordMaterialActivity();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await recordActivity.mutateAsync({
      materialId,
      input: {
        type,
        quantityKg: Number(quantityKg),
        note: note.trim() ? note.trim() : undefined,
      },
    });

    setQuantityKg("");
    setNote("");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="activity-material" className="text-sm font-medium">
          Material
        </label>
        <Select
          value={materialId}
          onValueChange={setMaterialId}
          disabled={materialsLoading}
        >
          <SelectTrigger id="activity-material" className="w-full">
            <SelectValue placeholder="Select a material" />
          </SelectTrigger>
          <SelectContent>
            {activeMaterials.map((material) => (
              <SelectItem key={material.id} value={material.id}>
                {material.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="activity-type" className="text-sm font-medium">
            Activity
          </label>
          <Select
            value={type}
            onValueChange={(value) => setType(value as typeof type)}
          >
            <SelectTrigger id="activity-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="activity-quantity" className="text-sm font-medium">
            Quantity (kg)
          </label>
          <Input
            id="activity-quantity"
            type="number"
            step="any"
            min="0"
            value={quantityKg}
            onChange={(event) => setQuantityKg(event.target.value)}
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="activity-note" className="text-sm font-medium">
          Note (optional)
        </label>
        <Input
          id="activity-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      {!materialsLoading && activeMaterials.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No active raw materials yet — ask a Manager to add one under Settings.
        </p>
      )}
      <Button
        type="submit"
        disabled={
          recordActivity.isPending ||
          materialsLoading ||
          activeMaterials.length === 0 ||
          !materialId
        }
      >
        {recordActivity.isPending ? "Recording…" : "Record activity"}
      </Button>
    </form>
  );
}
