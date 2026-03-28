import { createFileRoute } from "@tanstack/react-router";
import { TodosPage } from "@/features/todos";
import siteConfig from "~/site.config";

export const Route = createFileRoute("/_app/_auth/dashboard/_layout/todos")({
  component: TodosPage,
  head: () => ({
    meta: [{ title: `${siteConfig.siteTitle} - Todos` }],
  }),
  beforeLoad: () => ({
    headerTitle: "Todos",
    headerDescription: "Manage your todos.",
  }),
});
