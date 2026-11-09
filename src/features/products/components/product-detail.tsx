"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { RecipeEditor } from "@/features/raw-materials/components/recipe-editor";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { useProduct, useUpdateProduct } from "../hooks/use-products";
import { CostHistory } from "./cost-history";
import { PriceHistory } from "./price-history";
import { SetCostForm } from "./set-cost-form";
import { SetPriceForm } from "./set-price-form";

type Tab = "overview" | "price-history" | "cost-history" | "recipe";

function EditProductForm({
  productId,
  name: initialName,
  categoryId: initialCategoryId,
  lowStockThresholdKg: initialLowStockThresholdKg,
  onSuccess,
}: {
  productId: string;
  name: string;
  categoryId: string;
  lowStockThresholdKg: string | null;
  onSuccess: () => void;
}) {
  const { data: categoriesResult } = useCategories({
    pageSize: MAX_PAGE_SIZE,
  });
  const categories = categoriesResult?.data;
  const updateProduct = useUpdateProduct(productId);
  const [name, setName] = useState(initialName);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [lowStockThresholdKg, setLowStockThresholdKg] = useState(
    initialLowStockThresholdKg ?? "",
  );

  const handleSave = async () => {
    await updateProduct.mutateAsync({
      name,
      categoryId,
      lowStockThresholdKg: lowStockThresholdKg.trim()
        ? Number(lowStockThresholdKg)
        : null,
    });
    onSuccess();
  };

  return (
    <div className="flex flex-col gap-3">
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
        <label htmlFor="edit-product-category" className="text-sm font-medium">
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
      {updateProduct.isError && (
        <p className="text-sm text-destructive">
          Couldn&apos;t save this product.
        </p>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updateProduct.isPending}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function ProductOverview({
  productId,
  canManage,
}: {
  productId: string;
  canManage: boolean;
}) {
  const { data: product, isLoading } = useProduct(productId);
  const updateProduct = useUpdateProduct(productId);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (isLoading || !product) {
    return <DetailSkeleton rows={6} />;
  }

  const handleActivate = async () => {
    await updateProduct.mutateAsync({ isActive: true });
  };

  const handleConfirmDeactivate = async () => {
    await updateProduct.mutateAsync({ isActive: false });
    setIsConfirmOpen(false);
  };

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
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditOpen(true)}
              >
                Edit
              </Button>
              {product.isActive ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={updateProduct.isPending}
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleActivate}
                  disabled={updateProduct.isPending}
                >
                  Activate
                </Button>
              )}
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate product?</AlertDialogTitle>
                  <AlertDialogDescription>
                    &ldquo;{product.name}&rdquo; will no longer be available
                    when accepting stock or recording sales.
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
                <DialogTitle>Edit product</DialogTitle>
              </DialogHeader>
              <EditProductForm
                productId={productId}
                name={product.name}
                categoryId={product.categoryId}
                lowStockThresholdKg={product.lowStockThresholdKg}
                onSuccess={() => setIsEditOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}
    </dl>
  );
}

function PriceHistoryTab({
  productId,
  canManage,
}: {
  productId: string;
  canManage: boolean;
}) {
  const [isSetPriceOpen, setIsSetPriceOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Price history</h2>
        {canManage && (
          <Dialog open={isSetPriceOpen} onOpenChange={setIsSetPriceOpen}>
            <Button size="sm" onClick={() => setIsSetPriceOpen(true)}>
              Set new price
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set new price</DialogTitle>
              </DialogHeader>
              <SetPriceForm
                productId={productId}
                onSuccess={() => setIsSetPriceOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
      <PriceHistory productId={productId} />
    </div>
  );
}

function CostHistoryTab({
  productId,
  canManage,
}: {
  productId: string;
  canManage: boolean;
}) {
  const [isSetCostOpen, setIsSetCostOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Cost history</h2>
        {canManage && (
          <Dialog open={isSetCostOpen} onOpenChange={setIsSetCostOpen}>
            <Button size="sm" onClick={() => setIsSetCostOpen(true)}>
              Set new cost
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set new cost</DialogTitle>
              </DialogHeader>
              <SetCostForm
                productId={productId}
                onSuccess={() => setIsSetCostOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
      <CostHistory productId={productId} />
    </div>
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
  const { data: product } = useProduct(productId);
  usePageHeader({ title: product?.name });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-border">
        {(
          [
            { id: "overview", label: "Details" },
            { id: "price-history", label: "Price history" },
            { id: "cost-history", label: "Cost history" },
            { id: "recipe", label: "Recipe" },
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

      {tab === "overview" && (
        <ProductOverview productId={productId} canManage={canManage} />
      )}
      {tab === "price-history" && (
        <PriceHistoryTab productId={productId} canManage={canManage} />
      )}
      {tab === "cost-history" && (
        <CostHistoryTab productId={productId} canManage={canManage} />
      )}
      {tab === "recipe" && (
        <RecipeEditor productId={productId} canManage={canManage} />
      )}
    </div>
  );
}
