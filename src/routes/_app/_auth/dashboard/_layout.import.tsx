import { createFileRoute } from "@tanstack/react-router";
import { ImportWizard } from "@/features/import";
import siteConfig from "~/site.config";

export const Route = createFileRoute("/_app/_auth/dashboard/_layout/import")({
  component: ImportPage,
  head: () => ({
    meta: [{ title: `${siteConfig.siteTitle} - Import Data` }],
  }),
  beforeLoad: () => ({
    headerTitle: "Import Data",
    headerDescription: "Import data from Excel spreadsheets.",
  }),
});

function ImportPage() {
  return <ImportWizard />;
}
