import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { convexTestProviderPlugin } from "feather-testing-convex/vitest-plugin";
import path from "path";

export default defineConfig({
  plugins: [react(), convexTestProviderPlugin()],
  resolve: {
    alias: {
      "~": __dirname,
      "@": path.resolve(__dirname, "./src"),
      "@cvx": path.resolve(__dirname, "./convex"),
      // Resolve the internal @convex-dev/auth import for edge-runtime too
      "@convex-dev/auth/dist/react/client.js": path.resolve(
        __dirname,
        "node_modules/@convex-dev/auth/dist/react/client.js",
      ),
    },
  },
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [["convex/**", "edge-runtime"]],
    server: { deps: { inline: ["convex-test", "feather-testing-convex"] } },
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    // Scheduled Stripe actions fail in convex-test (no Stripe configured).
    // These fire as unhandled rejections from convex-test internals.
    dangerouslyIgnoreUnhandledErrors: true,
  },
});
