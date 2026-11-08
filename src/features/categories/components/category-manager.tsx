"use client";

import {
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  PencilSimpleIcon,
  PlusIcon,
  ProhibitIcon,
} from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
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
  useCategories,
  useCreateCategory,
  useDeactivateCategory,
  useUpdateCategory,
} from "../hooks/use-categories";
import type { CategoryDTO } from "../validators/category.schema";

function CreateCategoryForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createCategory = useCreateCategory();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await createCategory.mutateAsync({
      name,
      description: description || undefined,
    });

    setName("");
    setDescription("");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="new-category-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="new-category-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="new-category-description"
          className="text-sm font-medium"
        >
          Description
        </label>
        <Input
          id="new-category-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      {createCategory.isError && (
        <p className="text-sm text-destructive">
          Couldn&apos;t create category — check the name isn&apos;t already in
          use.
        </p>
      )}
      <Button type="submit" disabled={createCategory.isPending}>
        {createCategory.isPending ? "Adding…" : "Add category"}
      </Button>
    </form>
  );
}

function EditCategoryForm({
  category,
  onSuccess,
}: {
  category: CategoryDTO;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? "");
  const updateCategory = useUpdateCategory();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await updateCategory.mutateAsync({
      id: category.id,
      input: { name, description: description || undefined },
    });
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-category-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="edit-category-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="edit-category-description"
          className="text-sm font-medium"
        >
          Description
        </label>
        <Input
          id="edit-category-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      {updateCategory.isError && (
        <p className="text-sm text-destructive">
          Couldn&apos;t save this category.
        </p>
      )}
      <Button type="submit" disabled={updateCategory.isPending}>
        {updateCategory.isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

function CategoryRow({ category }: { category: CategoryDTO }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const updateCategory = useUpdateCategory();
  const deactivateCategory = useDeactivateCategory();

  async function handleActivate() {
    await updateCategory.mutateAsync({
      id: category.id,
      input: { isActive: true },
    });
  }

  async function handleConfirmDeactivate() {
    await deactivateCategory.mutateAsync(category.id);
    setIsConfirmOpen(false);
  }

  return (
    <TableRow>
      <TableCell>{category.name}</TableCell>
      <TableCell className="text-muted-foreground">
        {category.description ?? "—"}
      </TableCell>
      <TableCell>{category.isActive ? "Active" : "Inactive"}</TableCell>
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
                {category.isActive ? (
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
                <AlertDialogTitle>Deactivate category?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{category.name}&rdquo; will no longer be available when
                  creating or editing products.
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
              <DialogTitle>Edit category</DialogTitle>
            </DialogHeader>
            <EditCategoryForm
              category={category}
              onSuccess={() => setIsEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}

export function CategoryManager() {
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: result, isLoading } = useCategories({ page });
  const categories = result?.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon data-icon="inline-start" />
              Add category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add category</DialogTitle>
            </DialogHeader>
            <CreateCategoryForm onSuccess={() => setIsCreateOpen(false)} />
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
                  <TableHead className="bg-muted/50">Name</TableHead>
                  <TableHead className="bg-muted/50">Description</TableHead>
                  <TableHead className="bg-muted/50">Status</TableHead>
                  <TableHead className="bg-muted/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories?.length ? (
                  categories.map((category) => (
                    <CategoryRow key={category.id} category={category} />
                  ))
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No categories yet.
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
