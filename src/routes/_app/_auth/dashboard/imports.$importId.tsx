import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@cvx/_generated/api";
import { ImportReport } from "@/features/import/components/ImportReport";
import type { ImportError } from "~/templates/pipeline/excel/data-importer";
import type { Id } from "@cvx/_generated/dataModel";

export const Route = createFileRoute(
  "/_app/_auth/dashboard/imports/$importId",
)({
  component: ImportDetailPage,
});

function ImportDetailPage() {
  const { importId } = Route.useParams();
  const importDoc = useQuery(api.imports.queries.get, {
    importId: importId as Id<"imports">,
  });
  const errors = useQuery(api.imports.queries.getErrors, {
    importId: importId as Id<"imports">,
  });

  if (!importDoc) return <div>Loading...</div>;

  return <ImportReport importDoc={importDoc} errors={(errors ?? []) as ImportError[]} />;
}
