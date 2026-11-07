"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useCreateProduct } from "../hooks/use-products";

const inputClassName =
  "h-9 w-full rounded-none border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

export function CreateProductForm() {
  const router = useRouter();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const activeCategories =
    categories?.filter((category) => category.isActive) ?? [];

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const createProduct = useCreateProduct();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const product = await createProduct.mutateAsync({ name, categoryId });
    router.push(`/manager/products/${product.id}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="product-name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="product-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className={inputClassName}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="product-category" className="text-sm font-medium">
          Category
        </label>
        <select
          id="product-category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          required
          disabled={categoriesLoading}
          className={inputClassName}
        >
          <option value="" disabled>
            Select a category
          </option>
          {activeCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {!categoriesLoading && activeCategories.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No active categories yet — create one first.
          </p>
        )}
      </div>
      {createProduct.isError && (
        <p className="text-sm text-destructive">
          Couldn&apos;t create product.
        </p>
      )}
      <Button
        type="submit"
        disabled={createProduct.isPending || activeCategories.length === 0}
        className="mt-1"
      >
        {createProduct.isPending ? "Creating…" : "Create product"}
      </Button>
    </form>
  );
}
