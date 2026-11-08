"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailSkeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { useProduct, useUpdateProduct } from "../hooks/use-products";
import { PriceHistory } from "./price-history";
import { SetPriceForm } from "./set-price-form";

type Tab = "overview" | "price-history";

function ProductOverview({
  productId,
  canManage,
}: {
  productId: string;
  canManage: boolean;
}) {
  const { data: product, isLoading } = useProduct(productId);
  const { data: categoriesResult } = useCategories({
    pageSize: MAX_PAGE_SIZE,
  });
  const categories = categoriesResult?.data;
  const updateProduct = useUpdateProduct(productId);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [lowStockThresholdKg, setLowStockThresholdKg] = useState("");

  if (isLoading || !product) {
    return <DetailSkeleton rows={6} />;
  }

  const startEditing = () => {
    setName(product.name);
    setCategoryId(product.categoryId);
    setLowStockThresholdKg(product.lowStockThresholdKg ?? "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    await updateProduct.mutateAsync({
      name,
      categoryId,
      lowStockThresholdKg: lowStockThresholdKg.trim()
        ? Number(lowStockThresholdKg)
        : null,
    });
    setIsEditing(false);
  };

  const handleToggleActive = async () => {
    await updateProduct.mutateAsync({ isActive: !product.isActive });
  };

  if (isEditing) {
    return (
      <div className="flex max-w-sm flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="edit-product-name" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="edit-product-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="edit-product-category"
            className="text-sm font-medium"
          >
            Category
          </label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="edit-product-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="edit-product-low-stock-threshold"
            className="text-sm font-medium"
          >
            Low-stock alert threshold (kg)
          </label>
          <Input
            id="edit-product-low-stock-threshold"
            type="number"
            min="0"
            step="any"
            placeholder="No alert"
            value={lowStockThresholdKg}
            onChange={(event) => setLowStockThresholdKg(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Flagged on the Manager dashboard when stock falls below this. Leave
            blank to disable alerts for this product.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateProduct.isPending}
          >
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <dl className="flex max-w-sm flex-col gap-2">
      <div className="flex justify-between border-b border-border pb-2">
        <dt className="text-sm text-muted-foreground">Name</dt>
        <dd className="text-sm font-medium">{product.name}</dd>
      </div>
      <div className="flex justify-between border-b border-border pb-2">
        <dt className="text-sm text-muted-foreground">SKU</dt>
        <dd className="text-sm font-medium">{product.sku}</dd>
      </div>
      <div className="flex justify-between border-b border-border pb-2">
        <dt className="text-sm text-muted-foreground">Category</dt>
        <dd className="text-sm font-medium">{product.category.name}</dd>
      </div>
      <div className="flex justify-between border-b border-border pb-2">
        <dt className="text-sm text-muted-foreground">Current price / kg</dt>
        <dd className="text-sm font-medium">{product.currentPrice ?? "—"}</dd>
      </div>
      <div className="flex justify-between border-b border-border pb-2">
        <dt className="text-sm text-muted-foreground">
          Low-stock alert threshold
        </dt>
        <dd className="text-sm font-medium">
          {product.lowStockThresholdKg
            ? `${product.lowStockThresholdKg} kg`
            : "Disabled"}
        </dd>
      </div>
      <div className="flex justify-between pb-2">
        <dt className="text-sm text-muted-foreground">Status</dt>
        <dd className="text-sm font-medium">
          {product.isActive ? "Active" : "Inactive"}
        </dd>
      </div>
      {canManage && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={startEditing}>
            Edit
          </Button>
          <Button
            size="sm"
            variant={product.isActive ? "destructive" : "secondary"}
            onClick={handleToggleActive}
            disabled={updateProduct.isPending}
          >
            {product.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      )}
    </dl>
  );
}

export function ProductDetail({
  productId,
  canManage,
}: {
  productId: string;
  canManage: boolean;
}) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-border">
        {(
          [
            { id: "overview", label: "Details" },
            { id: "price-history", label: "Price history" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-3 py-2 text-sm font-medium ${
              tab === item.id
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <ProductOverview productId={productId} canManage={canManage} />
      ) : (
        <div className="flex flex-col gap-4">
          {canManage && <SetPriceForm productId={productId} />}
          <PriceHistory productId={productId} />
        </div>
      )}
    </div>
  );
}
