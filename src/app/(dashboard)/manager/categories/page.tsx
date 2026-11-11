import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
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
      <PageHeader description="Define product categories. Deactivating a category hides it from new product assignment without deleting its history." />
      <CategoryManager />
    </div>
  );
}
