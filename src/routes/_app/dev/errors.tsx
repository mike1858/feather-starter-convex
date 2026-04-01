import { createFileRoute } from "@tanstack/react-router";
import { DevErrorsDashboard } from "@/features/dev-errors";

export const Route = createFileRoute("/_app/dev/errors")({
  component: DevErrorsDashboard,
});
