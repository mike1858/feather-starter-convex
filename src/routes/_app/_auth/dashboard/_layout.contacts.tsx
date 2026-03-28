import { createFileRoute } from "@tanstack/react-router";
import { ContactsPage } from "@/features/contacts";
import siteConfig from "~/site.config";

export const Route = createFileRoute("/_app/_auth/dashboard/_layout/contacts")({
  component: ContactsPage,
  head: () => ({
    meta: [{ title: `${siteConfig.siteTitle} - Contacts` }],
  }),
  beforeLoad: () => ({
    headerTitle: "Contacts",
    headerDescription: "Manage your contacts.",
  }),
});
