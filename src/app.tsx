import { ConvexReactClient } from "convex/react";
import { RouterProvider } from "@tanstack/react-router";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "@/router";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import "@/i18n";
import { setConvexClient } from "@/shared/error-capture";

// Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
setConvexClient(convex);

const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
});

convexQueryClient.connect(queryClient);

function InnerApp() {
  return <RouterProvider router={router} context={{ queryClient }} />;
}

export default function App() {
  return (
    <ConvexAuthProvider client={convex}>
      <QueryClientProvider client={queryClient}>
        <InnerApp />
      </QueryClientProvider>
    </ConvexAuthProvider>
  );
}
