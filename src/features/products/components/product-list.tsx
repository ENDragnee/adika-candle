"use client";

import Link from "next/link";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { useProducts } from "../hooks/use-products";
import type { ProductDTO } from "../validators/product.schema";

const columns: DataTableColumn<ProductDTO>[] = [
  {
    key: "name",
    header: "Name",
    cell: (product) => (
      <Link
        href={`/manager/products/${product.id}`}
        className="underline underline-offset-4"
      >
        {product.name}
      </Link>
    ),
  },
  {
    key: "sku",
    header: "SKU",
    cell: (product) => product.sku,
    className: "text-muted-foreground",
  },
  {
    key: "category",
    header: "Category",
    cell: (product) => product.category.name,
  },
  {
    key: "price",
    header: "Current price / kg",
    cell: (product) => product.currentPrice ?? "—",
  },
  {
    key: "status",
    header: "Status",
    cell: (product) => (product.isActive ? "Active" : "Inactive"),
  },
];

export function ProductList() {
  const { data: products, isLoading } = useProducts();

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
    <DataTable
      columns={columns}
      data={products ?? []}
      getRowKey={(product) => product.id}
      emptyMessage="No products yet."
    />
  );
}
