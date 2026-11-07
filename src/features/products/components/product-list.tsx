"use client";

import Link from "next/link";
import { useProducts } from "../hooks/use-products";

export function ProductList() {
  const { data: products, isLoading } = useProducts();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading products…</p>;
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="p-2 text-sm font-medium">Name</th>
            <th className="p-2 text-sm font-medium">SKU</th>
            <th className="p-2 text-sm font-medium">Category</th>
            <th className="p-2 text-sm font-medium">Current price / kg</th>
            <th className="p-2 text-sm font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {products?.length ? (
            products.map((product) => (
              <tr key={product.id} className="border-b border-border">
                <td className="p-2 text-sm">
                  <Link
                    href={`/manager/products/${product.id}`}
                    className="underline underline-offset-4"
                  >
                    {product.name}
                  </Link>
                </td>
                <td className="p-2 text-sm text-muted-foreground">
                  {product.sku}
                </td>
                <td className="p-2 text-sm">{product.category.name}</td>
                <td className="p-2 text-sm">{product.currentPrice ?? "—"}</td>
                <td className="p-2 text-sm">
                  {product.isActive ? "Active" : "Inactive"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={5}
                className="p-3 text-center text-sm text-muted-foreground"
              >
                No products yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
