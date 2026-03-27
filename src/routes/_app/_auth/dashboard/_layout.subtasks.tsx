import { createFileRoute } from "@tanstack/react-router";
import { SubtasksPage } from "@/features/subtasks";
import siteConfig from "~/site.config";

export const Route = createFileRoute("/_app/_auth/dashboard/_layout/subtasks")({
  component: SubtasksPage,
  head: () => ({
    meta: [{ title: `${siteConfig.siteTitle} - Subtasks` }],
  }),
  beforeLoad: () => ({
    headerTitle: "Subtasks",
    headerDescription: "Manage your subtasks.",
  }),
});
