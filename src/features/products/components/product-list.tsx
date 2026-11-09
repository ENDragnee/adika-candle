"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import type { ExportColumn } from "@/lib/export/export-column";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { useProducts } from "../hooks/use-products";
import { FetchProducts } from "../services/product.service";
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

const exportColumns: ExportColumn<ProductDTO>[] = [
  { header: "Name", value: (product) => product.name },
  { header: "SKU", value: (product) => product.sku },
  { header: "Category", value: (product) => product.category.name },
  {
    header: "Current price / kg",
    value: (product) => product.currentPrice ?? "—",
  },
  {
    header: "Status",
    value: (product) => (product.isActive ? "Active" : "Inactive"),
  },
];

export function ProductList() {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useProducts({ page });

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ExportMenu
          filename="products"
          title="Products"
          columns={exportColumns}
          rows={() =>
            FetchProducts({ pageSize: MAX_PAGE_SIZE }).then(
              (result) => result.data,
            )
          }
        />
      </div>
      <DataTable
        columns={columns}
        data={result?.data ?? []}
        getRowKey={(product) => product.id}
        emptyMessage="No products yet."
        pagination={{
          page,
          totalPages: result?.pagination.totalPages ?? 1,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
