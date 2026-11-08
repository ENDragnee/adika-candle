"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { TableContainer, TableSkeleton } from "@/components/ui/data-table";
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
  useCategories,
  useCreateCategory,
  useDeactivateCategory,
  useUpdateCategory,
} from "../hooks/use-categories";
import type { CategoryDTO } from "../validators/category.schema";

function CreateCategoryForm() {
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
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3"
    >
      <div className="flex min-w-48 flex-1 flex-col gap-1">
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
      <div className="flex min-w-48 flex-1 flex-col gap-1">
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
      <Button type="submit" disabled={createCategory.isPending}>
        {createCategory.isPending ? "Adding…" : "Add category"}
      </Button>
      {createCategory.isError && (
        <p className="w-full text-sm text-destructive">
          Couldn&apos;t create category — check the name isn&apos;t already in
          use.
        </p>
      )}
    </form>
  );
}

function CategoryRow({ category }: { category: CategoryDTO }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? "");
  const updateCategory = useUpdateCategory();
  const deactivateCategory = useDeactivateCategory();

  async function handleSave() {
    await updateCategory.mutateAsync({
      id: category.id,
      input: { name, description: description || undefined },
    });
    setIsEditing(false);
  }

  function handleCancel() {
    setName(category.name);
    setDescription(category.description ?? "");
    setIsEditing(false);
  }

  async function handleToggleActive() {
    if (category.isActive) {
      await deactivateCategory.mutateAsync(category.id);
    } else {
      await updateCategory.mutateAsync({
        id: category.id,
        input: { isActive: true },
      });
    }
  }

  if (isEditing) {
    return (
      <TableRow>
        <TableCell>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </TableCell>
        <TableCell>
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </TableCell>
        <TableCell className="text-muted-foreground">
          {category.isActive ? "Active" : "Inactive"}
        </TableCell>
        <TableCell className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateCategory.isPending}
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
      <TableCell>{category.name}</TableCell>
      <TableCell className="text-muted-foreground">
        {category.description ?? "—"}
      </TableCell>
      <TableCell>{category.isActive ? "Active" : "Inactive"}</TableCell>
      <TableCell className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
          Edit
        </Button>
        <Button
          size="sm"
          variant={category.isActive ? "destructive" : "secondary"}
          onClick={handleToggleActive}
          disabled={deactivateCategory.isPending || updateCategory.isPending}
        >
          {category.isActive ? "Deactivate" : "Activate"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function CategoryManager() {
  const { data: categories, isLoading } = useCategories();

  return (
    <div className="flex flex-col gap-4">
      <CreateCategoryForm />
      {isLoading ? (
        <TableSkeleton columns={4} />
      ) : (
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
      )}
    </div>
  );
}
