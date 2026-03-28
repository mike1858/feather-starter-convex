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
    exclude: ["e2e/**", "node_modules/**", ".worktrees/**"],
    environmentMatchGlobs: [
      ["convex/**", "edge-runtime"],
      ["generators/**", "node"],
    ],
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
        "src/ui/sheet.tsx",
        // switch.tsx excluded: Radix wrapper, was only tested through billing UI (now removed)
        "src/ui/use-double-check.ts",
        "convex/**/*.ts",
      ],
      // ── Non-testable infra & excluded source ──────────────────────
      exclude: [
        // Minimal infra files
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
        // Activity logs has no user-facing mutations (created via helper from other mutations)
        "convex/activity-logs/mutations.ts",
        // Auto-generated
        "convex/_generated/**",
        // Test infrastructure
        "convex/testing/**",
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
        "errors.ts",
        "src/features/**/index.ts",
        "src/shared/schemas/index.ts",
        "src/utils/validators.ts",
        // Navigation shell (Radix dropdown menus, not unit-testable)
        "src/features/dashboard/components/Navigation.tsx",
        // Generated feature components (replaced by custom components in Plan 05-02)
        "src/features/subtasks/components/**",
        "src/features/work-logs/components/**",
        // Task detail panel components render inside Radix Dialog portal
        // jsdom cannot interact with portal children; backend tests cover all mutation/query logic
        "src/features/tasks/components/TaskDetailPanel.tsx",
        "src/features/tasks/components/SubtaskItem.tsx",
        "src/features/tasks/components/SubtaskList.tsx",
        "src/features/tasks/components/WorkLogForm.tsx",
        "src/features/tasks/components/WorkLogList.tsx",
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
