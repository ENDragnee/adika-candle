import { ErrorState } from "@/components/feedback/error-state";

// Unknown URLs and notFound() inside the dashboard keep the app shell, so
// the person can navigate straight on.
export default function DashboardNotFound() {
  return <ErrorState variant="not-found" />;
}
