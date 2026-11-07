import { redirect } from "next/navigation";
import { CategoryManager } from "@/features/categories/components/category-manager";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function CategoriesPage() {
  const allowed = await CheckPermission("category:manage");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define product categories. Deactivating a category hides it from new
          product assignment without deleting its history.
        </p>
      </div>
      <CategoryManager />
    </div>
  );
}
