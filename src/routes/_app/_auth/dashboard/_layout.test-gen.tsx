import { createFileRoute } from "@tanstack/react-router";
import { TestGenPage } from "@/features/test-gen";
import siteConfig from "~/site.config";

export const Route = createFileRoute("/_app/_auth/dashboard/_layout/test-gen")({
  component: TestGenPage,
  head: () => ({
    meta: [{ title: `${siteConfig.siteTitle} - Test Items` }],
  }),
  beforeLoad: () => ({
    headerTitle: "Test Items",
    headerDescription: "Manage your test items.",
  }),
});
