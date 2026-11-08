"use client";

import {
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  PencilSimpleIcon,
  PlusIcon,
  ProhibitIcon,
} from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import { usePageTitle } from "@/components/shell/use-page-title";
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
  useCreateUnitConversion,
  useDeactivateUnitConversion,
  useUnitConversions,
  useUpdateUnitConversion,
} from "../hooks/use-unit-conversions";
import type { UnitConversionDTO } from "../validators/unit-conversion.schema";

function CreateUnitConversionForm({ onSuccess }: { onSuccess: () => void }) {
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
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
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
      <div className="flex flex-col gap-1">
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
      {createUnitConversion.isError && (
        <p className="text-sm text-destructive">
          Couldn&apos;t create unit — check the name isn&apos;t already in use.
        </p>
      )}
      <Button type="submit" disabled={createUnitConversion.isPending}>
        {createUnitConversion.isPending ? "Adding…" : "Add unit"}
      </Button>
    </form>
  );
}

function EditUnitConversionForm({
  unit,
  onSuccess,
}: {
  unit: UnitConversionDTO;
  onSuccess: () => void;
}) {
  const [ratioToKg, setRatioToKg] = useState(unit.ratioToKg);
  const updateUnitConversion = useUpdateUnitConversion();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await updateUnitConversion.mutateAsync({
      id: unit.id,
      input: { ratioToKg: Number(ratioToKg) },
    });
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-unit-name" className="text-sm font-medium">
          Unit name
        </label>
        <Input id="edit-unit-name" value={unit.unitName} disabled />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-unit-ratio" className="text-sm font-medium">
          Ratio to KG
        </label>
        <Input
          id="edit-unit-ratio"
          type="number"
          step="any"
          min="0"
          value={ratioToKg}
          onChange={(event) => setRatioToKg(event.target.value)}
          required
        />
      </div>
      {updateUnitConversion.isError && (
        <p className="text-sm text-destructive">
          Couldn&apos;t save this unit.
        </p>
      )}
      <Button type="submit" disabled={updateUnitConversion.isPending}>
        {updateUnitConversion.isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

function UnitConversionRow({ unit }: { unit: UnitConversionDTO }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const updateUnitConversion = useUpdateUnitConversion();
  const deactivateUnitConversion = useDeactivateUnitConversion();

  async function handleActivate() {
    await updateUnitConversion.mutateAsync({
      id: unit.id,
      input: { isActive: true },
    });
  }

  async function handleConfirmDeactivate() {
    await deactivateUnitConversion.mutateAsync(unit.id);
    setIsConfirmOpen(false);
  }

  return (
    <TableRow>
      <TableCell>{unit.unitName}</TableCell>
      <TableCell className="text-muted-foreground">{unit.ratioToKg}</TableCell>
      <TableCell>{unit.isActive ? "Active" : "Inactive"}</TableCell>
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
                {unit.isActive ? (
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
                <AlertDialogTitle>Deactivate unit?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{unit.unitName}&rdquo; will no longer be available when
                  accepting stock or recording sales.
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
              <DialogTitle>Edit unit</DialogTitle>
            </DialogHeader>
            <EditUnitConversionForm
              unit={unit}
              onSuccess={() => setIsEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}

export function UnitConversionManager() {
  usePageTitle("Unit conversions");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: result, isLoading } = useUnitConversions({ page });
  const units = result?.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon data-icon="inline-start" />
              Add unit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add unit</DialogTitle>
            </DialogHeader>
            <CreateUnitConversionForm
              onSuccess={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <TableSkeleton columns={4} mobileCard={false} />
      ) : (
        <>
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
