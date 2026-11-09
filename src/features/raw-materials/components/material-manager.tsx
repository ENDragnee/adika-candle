"use client";

import {
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  PencilSimpleIcon,
  PlusIcon,
  ProhibitIcon,
} from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import { usePageHeader } from "@/components/shell/use-page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { TableContainer, TableSkeleton } from "@/components/ui/data-table";
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
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateRawMaterial,
  useDeactivateRawMaterial,
  useRawMaterials,
  useUpdateRawMaterial,
} from "../hooks/use-raw-materials";
import type { RawMaterialDTO } from "../validators/raw-material.schema";

function CreateMaterialForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const createMaterial = useCreateRawMaterial();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await createMaterial.mutateAsync({ name });

    setName("");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="new-material-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="new-material-name"
          placeholder="e.g. Wax - Local, Color - Red"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      {createMaterial.isError && (
        <p className="text-sm text-destructive">
          Couldn&apos;t create material — check the name isn&apos;t already in
          use.
        </p>
      )}
      <Button type="submit" disabled={createMaterial.isPending}>
        {createMaterial.isPending ? "Adding…" : "Add material"}
      </Button>
    </form>
  );
}

function EditMaterialForm({
  material,
  onSuccess,
}: {
  material: RawMaterialDTO;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(material.name);
  const updateMaterial = useUpdateRawMaterial();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await updateMaterial.mutateAsync({
      id: material.id,
      input: { name },
    });
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-material-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="edit-material-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      {updateMaterial.isError && (
        <p className="text-sm text-destructive">
          Couldn&apos;t save this material.
        </p>
      )}
      <Button type="submit" disabled={updateMaterial.isPending}>
        {updateMaterial.isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

function MaterialRow({ material }: { material: RawMaterialDTO }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const updateMaterial = useUpdateRawMaterial();
  const deactivateMaterial = useDeactivateRawMaterial();

  async function handleActivate() {
    await updateMaterial.mutateAsync({
      id: material.id,
      input: { isActive: true },
    });
  }

  async function handleConfirmDeactivate() {
    await deactivateMaterial.mutateAsync(material.id);
    setIsConfirmOpen(false);
  }

  return (
    <TableRow>
      <TableCell>{material.name}</TableCell>
      <TableCell>{material.isActive ? "Active" : "Inactive"}</TableCell>
      <TableCell>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Actions">
                  <DotsThreeVerticalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
                  <PencilSimpleIcon />
                  Edit
                </DropdownMenuItem>
                {material.isActive ? (
                  <DropdownMenuItem
                    onSelect={() => setIsConfirmOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <ProhibitIcon />
                    Deactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={handleActivate}>
                    <CheckCircleIcon />
                    Activate
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate material?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{material.name}&rdquo; will no longer be available when
                  recording activity or editing a product&apos;s recipe.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeactivate}>
                  Deactivate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit material</DialogTitle>
            </DialogHeader>
            <EditMaterialForm
              material={material}
              onSuccess={() => setIsEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}

export function MaterialManager() {
  usePageHeader({
    title: "Raw materials",
    description:
      "The catalog of production inputs (wax, color dye) tracked separately from finished-goods stock. Deactivating a material hides it from new activity entries and recipe rows without deleting its history.",
  });
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: result, isLoading } = useRawMaterials({ page });
  const materials = result?.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon data-icon="inline-start" />
              Add material
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add material</DialogTitle>
            </DialogHeader>
            <CreateMaterialForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <TableSkeleton columns={3} mobileCard={false} />
      ) : (
        <>
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="bg-muted/50">Name</TableHead>
                  <TableHead className="bg-muted/50">Status</TableHead>
                  <TableHead className="bg-muted/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials?.length ? (
                  materials.map((material) => (
                    <MaterialRow key={material.id} material={material} />
                  ))
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No raw materials yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination
            page={page}
            totalPages={result?.pagination.totalPages ?? 1}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
