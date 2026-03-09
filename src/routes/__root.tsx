import { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Outlet,
  useRouter,
} from "@tanstack/react-router";
import React, { Suspense } from "react";
import { Helmet } from "react-helmet-async";

const TanStackRouterDevtools =
  process.env.NODE_ENV === "production"
    ? () => null // Render nothing in production
    : React.lazy(() =>
        // Lazy load in development
        import("@tanstack/router-devtools").then((res) => ({
          default: res.TanStackRouterDevtools,
          // For Embedded Mode
          // default: res.TanStackRouterDevtoolsPanel
        })),
      );

function RootComponent() {
  const router = useRouter();
  const matchWithTitle = [...router.state.matches]
    .reverse()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .find((d) => (d.context as Record<string, any>)?.title);
  const title =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (matchWithTitle?.context as Record<string, any>)?.title ||
    "Feather Starter";

  return (
    <>
      <Outlet />
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <Suspense>
        <TanStackRouterDevtools />
      </Suspense>
    </>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootComponent,
});
