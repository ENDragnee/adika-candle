"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
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
import { useCategories } from "@/features/categories/hooks/use-categories";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { useCreateProduct } from "../hooks/use-products";

export function CreateProductForm({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter();
  const { data: categoriesResult, isLoading: categoriesLoading } =
    useCategories({ pageSize: MAX_PAGE_SIZE });
  const activeCategories =
    categoriesResult?.data.filter((category) => category.isActive) ?? [];

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const createProduct = useCreateProduct();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const product = await createProduct.mutateAsync({ name, categoryId });
    onSuccess();
    router.push(`/manager/products/${product.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="product-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="product-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="product-category" className="text-sm font-medium">
          Category
        </label>
        <Select
          value={categoryId}
          onValueChange={setCategoryId}
          disabled={categoriesLoading}
        >
          <SelectTrigger id="product-category" className="w-full">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {activeCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <PlusIcon data-icon="inline-start" />
        {createProduct.isPending ? "Creating…" : "Create product"}
      </Button>
    </form>
  );
}
