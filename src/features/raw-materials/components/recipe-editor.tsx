"use client";

import {
  DotsThreeVerticalIcon,
  PencilSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormatNumber } from "@/lib/format";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import {
  useCreateMaterialRequirement,
  useMaterialRequirements,
  useUpdateMaterialRequirement,
} from "../hooks/use-material-requirements";
import { useRawMaterials } from "../hooks/use-raw-materials";
import type { ProductMaterialRequirementDTO } from "../validators/material-requirement.schema";

function AddRequirementForm({
  productId,
  existingMaterialIds,
  onSuccess,
}: {
  productId: string;
  existingMaterialIds: string[];
  onSuccess: () => void;
}) {
  const { data: materialsResult, isLoading: materialsLoading } =
    useRawMaterials({ pageSize: MAX_PAGE_SIZE });
  const availableMaterials = (materialsResult?.data ?? []).filter(
    (material) =>
      material.isActive && !existingMaterialIds.includes(material.id),
  );

  const [materialId, setMaterialId] = useState("");
  const [quantityKgPerOutputKg, setQuantityKgPerOutputKg] = useState("");
  const createRequirement = useCreateMaterialRequirement(productId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await createRequirement.mutateAsync({
      materialId,
      quantityKgPerOutputKg: Number(quantityKgPerOutputKg),
    });

    setMaterialId("");
    setQuantityKgPerOutputKg("");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="requirement-material" className="text-sm font-medium">
          Material
        </label>
        <Select
          value={materialId}
          onValueChange={setMaterialId}
          disabled={materialsLoading}
        >
          <SelectTrigger id="requirement-material" className="w-full">
            <SelectValue placeholder="Select a material" />
          </SelectTrigger>
          <SelectContent>
            {availableMaterials.map((material) => (
              <SelectItem key={material.id} value={material.id}>
                {material.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="requirement-quantity" className="text-sm font-medium">
          kg of material per kg of output
        </label>
        <Input
          id="requirement-quantity"
          type="number"
          step="any"
          min="0"
          value={quantityKgPerOutputKg}
          onChange={(event) => setQuantityKgPerOutputKg(event.target.value)}
          required
        />
      </div>
      {!materialsLoading && availableMaterials.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No remaining active materials to add — every active material already
          has a requirement row, or none exist yet.
        </p>
      )}
      <Button
        loading={createRequirement.isPending}
        type="submit"
        disabled={
          createRequirement.isPending ||
          materialsLoading ||
          availableMaterials.length === 0 ||
          !materialId
        }
      >
        {createRequirement.isPending ? "Adding…" : "Add requirement"}
      </Button>
    </form>
  );
}

function EditRequirementForm({
  productId,
  requirement,
  onSuccess,
}: {
  productId: string;
  requirement: ProductMaterialRequirementDTO;
  onSuccess: () => void;
}) {
  const [quantityKgPerOutputKg, setQuantityKgPerOutputKg] = useState(
    requirement.quantityKgPerOutputKg,
  );
  const updateRequirement = useUpdateMaterialRequirement(productId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await updateRequirement.mutateAsync({
      materialId: requirement.materialId,
      quantityKgPerOutputKg: Number(quantityKgPerOutputKg),
    });
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Material</span>
        <Input value={requirement.materialName} disabled />
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="edit-requirement-quantity"
          className="text-sm font-medium"
        >
          kg of material per kg of output
        </label>
        <Input
          id="edit-requirement-quantity"
          type="number"
          step="any"
          min="0"
          value={quantityKgPerOutputKg}
          onChange={(event) => setQuantityKgPerOutputKg(event.target.value)}
          required
        />
      </div>
      <Button
        loading={updateRequirement.isPending}
        type="submit"
        disabled={updateRequirement.isPending}
      >
        {updateRequirement.isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function RecipeEditor({
  productId,
  canManage,
}: {
  productId: string;
  canManage: boolean;
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] =
    useState<ProductMaterialRequirementDTO | null>(null);
  const { data: requirements, isLoading } = useMaterialRequirements(productId);

  const columns: DataTableColumn<ProductMaterialRequirementDTO>[] = [
    { key: "material", header: "Material", cell: (row) => row.materialName },
    {
      key: "ratio",
      header: "kg per kg of output",
      cell: (row) => `${FormatNumber(row.quantityKgPerOutputKg, 3)} kg per kg`,
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "Actions",
            cell: (row: ProductMaterialRequirementDTO) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Actions">
                    <DotsThreeVerticalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setEditTarget(row)}>
                    <PencilSimpleIcon />
                    Edit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Recipe</h2>
          <p className="text-xs text-muted-foreground">
            Optional. How many kg of each raw material go into 1 kg of this
            candle. Used to estimate expected output in Analytics → Production;
            without a recipe that report shows actual output only.
          </p>
        </div>
        {canManage && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusIcon data-icon="inline-start" />
                Add requirement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add material requirement</DialogTitle>
              </DialogHeader>
              <AddRequirementForm
                productId={productId}
                existingMaterialIds={(requirements ?? []).map(
                  (row) => row.materialId,
                )}
                onSuccess={() => setIsAddOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
      {isLoading ? (
        <TableSkeleton columns={columns.length} />
      ) : (
        <DataTable
          columns={columns}
          data={requirements ?? []}
          getRowKey={(row) => row.id}
          emptyMessage="No recipe rows yet."
        />
      )}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit material requirement</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <EditRequirementForm
              productId={productId}
              requirement={editTarget}
              onSuccess={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
