"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { CardSkeleton, DetailSkeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { RecipeEditor } from "@/features/raw-materials/components/recipe-editor";
import { SaleList } from "@/features/sales/components/sale-list";
import { useSales } from "@/features/sales/hooks/use-sales";
import { StockStatusBadge } from "@/features/stock/components/stock-status-badge";
import { useStockBalances } from "@/features/stock/hooks/use-stock";
import { ClassifyStock } from "@/features/stock/stock-status";
import {
  AddBusinessDays,
  BusinessDateKey,
  StartOfBusinessDay,
} from "@/lib/business-time";
import { FormatKg, FormatMoney, FormatPercent } from "@/lib/format";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { useProduct, useUpdateProduct } from "../hooks/use-products";
import { CostHistory } from "./cost-history";
import { PriceHistory } from "./price-history";
import { SetCostForm } from "./set-cost-form";
import { SetPriceForm } from "./set-price-form";

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
        <dd className="text-sm font-medium">
          {FormatMoney(product.currentPrice)}
        </dd>
      </div>
      <div className="flex justify-between border-b border-border pb-2">
        <dt className="text-sm text-muted-foreground">
          Low-stock alert threshold
        </dt>
        <dd className="text-sm font-medium">
          {product.lowStockThresholdKg
            ? FormatKg(product.lowStockThresholdKg)
            : "Not set"}
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
  const { data: product } = useProduct(productId);

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
                <DialogDescription>{product?.name}</DialogDescription>
              </DialogHeader>
              <SetPriceForm
                productId={productId}
                currentPrice={product?.currentPrice ?? null}
                currentCost={product?.currentCost ?? null}
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
  const { data: product } = useProduct(productId);

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
                <DialogDescription>
                  What 1 kg of {product?.name} costs to make. Used for profit
                  and margin.
                </DialogDescription>
              </DialogHeader>
              <SetCostForm
                productId={productId}
                currentPrice={product?.currentPrice ?? null}
                currentCost={product?.currentCost ?? null}
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

const TABS = ["overview", "sales", "prices", "costs", "recipe"] as const;
type Tab = (typeof TABS)[number];

function SummaryFact({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold tabular-nums">{children}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </CardContent>
    </Card>
  );
}

// "How is this product doing?" in one strip (Epic 21): stock on hand with
// its status, price, cost, margin, and the last 30 days' sales — before,
// answering that meant visiting Stock, Analytics and Sales separately.
function ProductSummary({ productId }: { productId: string }) {
  const { data: product } = useProduct(productId);
  const { data: stock } = useStockBalances({ productId });
  const { data: sales } = useSales({
    productId,
    from: BusinessDateKey(AddBusinessDays(StartOfBusinessDay(new Date()), -29)),
    pageSize: 1,
  });
  const balance = stock?.data[0];

  if (!product || !balance) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const status = ClassifyStock(
    Number(balance.quantityKg),
    balance.thresholdKg === null ? null : Number(balance.thresholdKg),
  );
  const price =
    product.currentPrice === null ? null : Number(product.currentPrice);
  const cost =
    product.currentCost === null ? null : Number(product.currentCost);
  const margin =
    price !== null && cost !== null && price > 0
      ? ((price - cost) / price) * 100
      : null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Link
        href={`/manager/stock/${productId}`}
        className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <SummaryFact
          label="On hand"
          hint={<StockStatusBadge status={status} />}
        >
          {FormatKg(balance.quantityKg)}
        </SummaryFact>
      </Link>
      <SummaryFact
        label="Price / kg"
        hint={price === null ? "Not set — can't be sold" : undefined}
      >
        {FormatMoney(product.currentPrice)}
      </SummaryFact>
      <SummaryFact
        label="Cost / kg"
        hint={cost === null ? "Not set" : undefined}
      >
        {FormatMoney(product.currentCost)}
      </SummaryFact>
      <SummaryFact
        label="Margin"
        hint={margin !== null && margin < 0 ? "Selling below cost" : undefined}
      >
        {FormatPercent(margin)}
      </SummaryFact>
      <SummaryFact
        label="Sold, last 30 days"
        hint={sales ? FormatMoney(sales.summary.totalAmount) : undefined}
      >
        {sales ? FormatKg(sales.summary.totalKg) : "…"}
      </SummaryFact>
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = searchParams.get("tab");
  // The tab lives in ?tab= so the Dashboard can link straight to e.g.
  // "Set price" for a product that has none.
  const tab: Tab = TABS.includes(requested as Tab)
    ? (requested as Tab)
    : "overview";
  const { data: product } = useProduct(productId);
  usePageHeader({
    title: product?.name ?? null,
    description: product
      ? `${product.category.name} · SKU ${product.sku}${product.isActive ? "" : " · inactive"}`
      : null,
    parent: { label: "Products", href: "/manager/products" },
  });

  return (
    <div className="flex flex-col gap-6">
      <ProductSummary productId={productId} />
      <Tabs
        value={tab}
        onValueChange={(value) =>
          router.replace(`${pathname}?tab=${value}`, { scroll: false })
        }
        className="gap-4"
      >
        <TabsList>
          <TabsTrigger value="overview">Details</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="prices">Price history</TabsTrigger>
          <TabsTrigger value="costs">Cost history</TabsTrigger>
          <TabsTrigger value="recipe">Recipe</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <ProductOverview productId={productId} canManage={canManage} />
        </TabsContent>
        <TabsContent value="sales">
          <SaleList productId={productId} initialRange="30d" />
        </TabsContent>
        <TabsContent value="prices">
          <PriceHistoryTab productId={productId} canManage={canManage} />
        </TabsContent>
        <TabsContent value="costs">
          <CostHistoryTab productId={productId} canManage={canManage} />
        </TabsContent>
        <TabsContent value="recipe">
          <RecipeEditor productId={productId} canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
