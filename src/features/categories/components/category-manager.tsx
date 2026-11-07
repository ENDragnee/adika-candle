"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useCategories,
  useCreateCategory,
  useDeactivateCategory,
  useUpdateCategory,
} from "../hooks/use-categories";
import type { CategoryDTO } from "../validators/category.schema";

const inputClassName =
  "h-8 w-full rounded-none border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

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
      className="flex flex-wrap items-end gap-2 border border-border p-3"
    >
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <label htmlFor="new-category-name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="new-category-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className={inputClassName}
        />
      </div>
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <label
          htmlFor="new-category-description"
          className="text-sm font-medium"
        >
          Description
        </label>
        <input
          id="new-category-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={inputClassName}
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
      <tr className="border-b border-border">
        <td className="p-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClassName}
          />
        </td>
        <td className="p-2">
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={inputClassName}
          />
        </td>
        <td className="p-2 text-sm text-muted-foreground">
          {category.isActive ? "Active" : "Inactive"}
        </td>
        <td className="flex gap-2 p-2">
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
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border">
      <td className="p-2 text-sm">{category.name}</td>
      <td className="p-2 text-sm text-muted-foreground">
        {category.description ?? "—"}
      </td>
      <td className="p-2 text-sm">
        {category.isActive ? "Active" : "Inactive"}
      </td>
      <td className="flex gap-2 p-2">
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
      </td>
    </tr>
  );
}

export function CategoryManager() {
  const { data: categories, isLoading } = useCategories();

  return (
    <div className="flex flex-col gap-4">
      <CreateCategoryForm />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading categories…</p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-2 text-sm font-medium">Name</th>
                <th className="p-2 text-sm font-medium">Description</th>
                <th className="p-2 text-sm font-medium">Status</th>
                <th className="p-2 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories?.length ? (
                categories.map((category) => (
                  <CategoryRow key={category.id} category={category} />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="p-3 text-center text-sm text-muted-foreground"
                  >
                    No categories yet.
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
