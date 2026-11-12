"use client";

import { WarningIcon } from "@phosphor-icons/react";
import Link from "next/link";
import type * as React from "react";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { ListSearch } from "@/components/ui/list-search";
import { ToneBadge } from "@/components/ui/tone-badge";
import type { ExportColumn } from "@/lib/export/export-column";
import { FormatMoney, FormatPercent } from "@/lib/format";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { useListParams } from "@/lib/use-list-params";
import { cn } from "@/lib/utils";
import { useProducts } from "../hooks/use-products";
import { FetchProducts } from "../services/product.service";
import type { ProductDTO } from "../validators/product.schema";

function Margin(product: ProductDTO): number | null {
  if (product.currentPrice === null || product.currentCost === null) {
    return null;
  }
  const price = Number(product.currentPrice);
  return price > 0
    ? ((price - Number(product.currentCost)) / price) * 100
    : null;
}

function Missing({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <WarningIcon
        weight="fill"
        className="size-3.5"
        style={{ color: "var(--color-status-warning)" }}
      />
      {children}
    </span>
  );
}

const columns: DataTableColumn<ProductDTO>[] = [
  {
    key: "name",
    header: "Product",
    sortKey: "name",
    cell: (product) => (
      <span className="flex flex-col">
        <Link
          href={`/manager/products/${product.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {product.name}
        </Link>
        <span className="text-xs text-muted-foreground">{product.sku}</span>
      </span>
    ),
  },
  {
    key: "category",
    header: "Category",
    cell: (product) => product.category.name,
    className: "text-muted-foreground",
  },
  {
    key: "price",
    header: "Price / kg",
    cell: (product) =>
      product.currentPrice === null ? (
        <Missing>Not set</Missing>
      ) : (
        FormatMoney(product.currentPrice)
      ),
    className: "text-right tabular-nums",
  },
  {
    key: "cost",
    header: "Cost / kg",
    cell: (product) =>
      product.currentCost === null ? (
        <Missing>Not set</Missing>
      ) : (
        FormatMoney(product.currentCost)
      ),
    className: "text-right tabular-nums",
  },
  {
    key: "margin",
    header: "Margin",
    cell: (product) => {
      const margin = Margin(product);
      return (
        <span
          className={cn(
            "tabular-nums",
            margin === null && "text-muted-foreground",
          )}
          style={
            margin !== null && margin < 0
              ? { color: "var(--color-status-critical)" }
              : undefined
          }
        >
          {FormatPercent(margin)}
        </span>
      );
    },
    className: "text-right",
  },
  {
    key: "status",
    header: "Status",
    cell: (product) => (
      <ToneBadge tone={product.isActive ? "good" : "neutral"}>
        {product.isActive ? "Active" : "Inactive"}
      </ToneBadge>
    ),
  },
];

const exportColumns: ExportColumn<ProductDTO>[] = [
  { header: "Name", value: (product) => product.name },
  { header: "SKU", value: (product) => product.sku },
  { header: "Category", value: (product) => product.category.name },
  { header: "Price / kg", value: (product) => product.currentPrice ?? "" },
  { header: "Cost / kg", value: (product) => product.currentCost ?? "" },
  {
    header: "Margin %",
    value: (product) => Margin(product)?.toFixed(1) ?? "",
  },
  {
    header: "Status",
    value: (product) => (product.isActive ? "Active" : "Inactive"),
  },
];

export function ProductList() {
  const list = useListParams<"name" | "sku" | "createdAt">("name");
  const { data: result, isLoading, isFetching } = useProducts(list.params);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ListSearch
          placeholder="Search name or SKU…"
          onSearch={list.setSearch}
          className="w-full sm:w-64"
        />
        <ExportMenu
          filename="products"
          title="Products"
          columns={exportColumns}
          rows={() =>
            FetchProducts({
              ...list.params,
              page: 1,
              pageSize: MAX_PAGE_SIZE,
            }).then((page) => page.data)
          }
        />
      </div>
      {isLoading ? (
        <TableSkeleton columns={columns.length} />
      ) : (
        <div className={cn(isFetching && "opacity-70 transition-opacity")}>
          <DataTable
            columns={columns}
            data={result?.data ?? []}
            getRowKey={(product) => product.id}
            emptyMessage="No products match."
            sort={list.sort}
            pagination={list.Bind(result?.pagination)}
          />
        </div>
      )}
    </div>
  );
}
