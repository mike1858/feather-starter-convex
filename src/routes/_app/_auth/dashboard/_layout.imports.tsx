import { createFileRoute } from "@tanstack/react-router";
import { ImportHistory } from "@/features/import/components/ImportHistory";

export const Route = createFileRoute("/_app/_auth/dashboard/_layout/imports")({
  component: ImportHistoryPage,
});

function ImportHistoryPage() {
  return <ImportHistory />;
}
