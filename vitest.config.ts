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
    server: {
      deps: {
        inline: [
          "convex-test",
          "feather-testing-convex",
          "@xixixao/uploadstuff",
        ],
      },
    },
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      // ── Testable source files (glob-based for restructure resilience) ─
      include: [
        "src/features/**/*.{ts,tsx}",
        "src/shared/**/*.{ts,tsx}",
        "src/utils/**/*.{ts,tsx}",
        "src/ui/button.tsx",
        "src/ui/button-util.ts",
        "src/ui/input.tsx",
        "src/ui/switch.tsx",
        "src/ui/use-double-check.ts",
        "convex/**/*.ts",
        "errors.ts",
      ],
      // ── Non-testable infra & excluded source ──────────────────────
      exclude: [
        // Stripe & external service integrations
        "convex/http.ts",
        "convex/email/**",
        "convex/otp/**",
        "convex/password/**",
        // Auth provider config (no logic to test)
        "convex/auth.ts",
        "convex/auth.config.ts",
        "convex/env.ts",
        // Seed / init scripts
        "convex/init.ts",
        // Auto-generated
        "convex/_generated/**",
        // Test infrastructure
        "convex/test.setup.ts",
        "src/test-helpers.tsx",
        "src/test-setup.ts",
        "**/*.test.*",
        // Framework / entrypoint files
        "src/main.tsx",
        "src/app.tsx",
        "src/router.tsx",
        "src/routeTree.gen.ts",
        "src/i18n.ts",
        "src/vite-env.d.ts",
        // Static config (no executable logic)
        "site.config.ts",
        // Type-only files
        "types.ts",
        "src/types/**",
        // Radix wrapper UI components (pure pass-through)
        "src/ui/dropdown-menu.tsx",
        "src/ui/header.tsx",
        "src/ui/select.tsx",
        "src/ui/logo.tsx",
        "src/ui/language-switcher.tsx",
        "src/ui/theme-switcher.tsx",
        // Pure re-exports (barrel files, no logic)
        "src/features/**/index.ts",
        // Navigation shell (Radix dropdown menus, not unit-testable)
        "src/features/dashboard/components/Navigation.tsx",
        // Routes (thin wrappers, not coverage-worthy)
        "src/routes/**",
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
