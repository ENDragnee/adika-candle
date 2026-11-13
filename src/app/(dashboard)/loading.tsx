import { ListPageSkeleton } from "@/components/ui/page-skeletons";

// Fallback for every dashboard route without its own loading.tsx.
export default function Loading() {
  return <ListPageSkeleton />;
}
