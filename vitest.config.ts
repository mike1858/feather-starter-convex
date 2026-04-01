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
    exclude: ["e2e/**", "node_modules/**", ".worktrees/**", ".claude/worktrees/**"],
    environmentMatchGlobs: [
      ["convex/**", "edge-runtime"],
      ["generators/**", "node"],
      ["lib/**", "node"],
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
        // switch.tsx excluded — Radix wrapper, only used by generated form components
        "src/ui/use-double-check.ts",
        "convex/**/*.ts",
      ],
      // ── Non-testable infra & excluded source ──────────────────────
      exclude: [
        // --- Auto-generated code ---
        "convex/_generated/**",
        "convex/generated/**",
        "src/generated/**",
        "src/routeTree.gen.ts",

        // --- Test infrastructure ---
        "convex/testing/**",
        "convex/test.setup.ts",
        "src/test-helpers.tsx",
        "src/test-setup.ts",
        "**/*.test.*",

        // --- Framework / entrypoint files ---
        "src/main.tsx",
        "src/app.tsx",
        "src/router.tsx",
        "src/i18n.ts",
        "src/vite-env.d.ts",

        // --- Backend infra (no testable logic) ---
        "convex/http.ts",
        "convex/email/**",
        "convex/otp/**",
        "convex/password/**",
        "convex/auth.ts",
        "convex/auth.config.ts",
        "convex/env.ts",
        "convex/init.ts",
        // Activity logs: helper-only, called by other mutations, tested via callers
        "convex/activityLogs/mutations.ts",

        // --- Static config (no executable logic) ---
        "site.config.ts",

        // --- Type-only files ---
        "types.ts",
        "src/types/**",
        // schema-mappings.ts is a pure Zod type definition used only for TypeScript types
        // (not imported by convex/schema.ts — backend uses inline JSON.parse typing)
        "src/shared/schemas/schema-mappings.ts",

        // --- Pure pass-through Radix wrappers (no props transformation, no logic) ---
        "src/ui/switch.tsx",
        "src/ui/dropdown-menu.tsx",
        "src/ui/header.tsx",
        "src/ui/select.tsx",
        "src/ui/logo.tsx",
        "src/ui/language-switcher.tsx",
        "src/ui/theme-switcher.tsx",

        // --- Pure re-exports (barrel files, no logic) ---
        "errors.ts",
        "src/features/**/index.ts",
        "src/shared/schemas/index.ts",
        "src/utils/validators.ts",

        // --- Routes (thin wrappers under 20 lines) ---
        "src/routes/**",

        // --- Radix portal components (jsdom cannot interact with portal children) ---
        // Backend tests cover all mutation/query logic for these
        "src/features/tasks/components/TaskDetailPanel.tsx",
        "src/features/tasks/components/SubtaskItem.tsx",
        "src/features/tasks/components/SubtaskList.tsx",
        "src/features/tasks/components/WorkLogForm.tsx",
        "src/features/tasks/components/WorkLogList.tsx",

        // --- Components with heavy Radix Select/Dropdown/dnd-kit (>50% untestable in jsdom) ---
        // Logic tested via backend tests; E2E planned for UI interactions
        "src/features/tasks/components/TaskList.tsx",
        "src/features/tasks/components/TaskItem.tsx",
        "src/features/tasks/components/TaskForm.tsx",
        "src/features/tasks/components/TasksPage.tsx",
        "src/features/tasks/components/TeamPoolPage.tsx",
        "src/features/tasks/components/TaskFilterBar.tsx",
        "src/features/projects/components/ProjectDetailPage.tsx",
        "src/features/projects/components/ProjectCard.tsx",
        "src/features/dashboard/components/Navigation.tsx",
        "src/features/dashboard/components/GlobalSearchBox.tsx",
        "src/features/dashboard/components/SearchResultsDropdown.tsx",

        // --- Generated scaffold components (replaced or not yet customized) ---
        "src/features/subtasks/components/**",
        "src/features/work-logs/components/**",

        // --- Deferred: generated example apps (Phase 03.2.1.1 will regenerate) ---
        "convex/todos/**",
        "convex/tickets/**",
        "convex/contacts/**",
        "src/features/contacts/components/**",
        "src/features/todos/components/TodosDetailPage.tsx",
        "src/features/todos/components/TodosLoadingSkeleton.tsx",
        "src/features/todos/components/TodosListView.tsx",
        "src/features/todos/components/TodosForm.tsx",
        "src/features/todos/components/TodosItem.tsx",
        "src/features/todos/components/TodosFilterBar.tsx",
        "src/features/tickets/components/TicketsDetailPage.tsx",
        "src/features/tickets/components/TicketsLoadingSkeleton.tsx",
        "src/features/tickets/components/TicketsListView.tsx",
        "src/features/tickets/components/TicketsForm.tsx",
        "src/features/tickets/components/TicketsStatusBadge.tsx",
        "src/features/tickets/components/TicketsItem.tsx",
        "src/features/tickets/components/TicketsFilterBar.tsx",

        // --- Import wizard: Convex-dependent container + analysis hook (Plan 03) ---
        // ImportWizard orchestrates Convex useMutation/useAction hooks; useSchemaAnalysis
        // calls parseExcelWorkbook + Convex mutations. Tested via E2E.
        "src/features/import/components/ImportWizard.tsx",
        "src/features/import/hooks/useSchemaAnalysis.ts",

        // --- Generator infrastructure (Phase 999.1 scope) ---
        "bin/**",
        "templates/**",
        "generators/**",
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
