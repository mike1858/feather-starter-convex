import { createFileRoute } from "@tanstack/react-router";
import { WorkLogsPage } from "@/features/work-logs";
import siteConfig from "~/site.config";

export const Route = createFileRoute("/_app/_auth/dashboard/_layout/work-logs")({
  component: WorkLogsPage,
  head: () => ({
    meta: [{ title: `${siteConfig.siteTitle} - Work Logs` }],
  }),
  beforeLoad: () => ({
    headerTitle: "Work Logs",
    headerDescription: "Manage your work logs.",
  }),
});
