import { createFileRoute } from "@tanstack/react-router";
import { TicketsPage } from "@/features/tickets";
import siteConfig from "~/site.config";

export const Route = createFileRoute("/_app/_auth/dashboard/_layout/tickets")({
  component: TicketsPage,
  head: () => ({
    meta: [{ title: `${siteConfig.siteTitle} - Tickets` }],
  }),
  beforeLoad: () => ({
    headerTitle: "Tickets",
    headerDescription: "Manage your tickets.",
  }),
});
