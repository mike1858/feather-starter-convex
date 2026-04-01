/**
 * End-to-end integration tests for the create-feather flow.
 *
 * Strategy: Copy a real project snapshot to a temp dir, run strip,
 * then scaffold/add to verify the round-trip. No network (git clone) needed.
 */
import { describe, test, expect, beforeEach, afterEach, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execSync } from "node:child_process";
import { stripToBase } from "../strip-to-base";
import { defaultStripConfig } from "../strip-config";
import { getAuthTemplate } from "./auth-config";
import { applyBranding } from "./branding";
import { addAction } from "../../bin/commands/add";
import { removeAction } from "../../bin/commands/remove";

// ── Test fixtures ───────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "integration-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Create a full project snapshot in tmpDir that mimics the real project
 * structure (features + infrastructure + wiring files + example bundles).
 */
function createFullProjectSnapshot(root: string): void {
  // Infrastructure frontend
  for (const infra of [
    "auth",
    "dashboard",
    "onboarding",
    "settings",
    "uploads",
  ]) {
    fs.mkdirSync(path.join(root, "src/features", infra), { recursive: true });
    fs.writeFileSync(
      path.join(root, "src/features", infra, "index.ts"),
      `export const ${infra} = true;\n`,
    );
  }

  // Feature frontend directories
  for (const feature of defaultStripConfig.features) {
    fs.mkdirSync(
      path.join(root, "src/features", feature, "components"),
      { recursive: true },
    );
    fs.writeFileSync(
      path.join(root, "src/features", feature, "index.ts"),
      `export const ${feature} = true;\n`,
    );
  }

  // Feature backend directories
  for (const feature of defaultStripConfig.features) {
    const backendName =
      defaultStripConfig.backendDirMap[feature] ?? feature;
    fs.mkdirSync(path.join(root, "convex", backendName), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(root, "convex", backendName, "mutations.ts"),
      `export const ${backendName} = true;\n`,
    );
  }

  // Infrastructure backend
  for (const infra of ["auth", "users", "devEmails", "otp", "password"]) {
    fs.mkdirSync(path.join(root, "convex", infra), { recursive: true });
    fs.writeFileSync(
      path.join(root, "convex", infra, "index.ts"),
      `export const ${infra} = true;\n`,
    );
  }

  // Shared schemas
  fs.mkdirSync(path.join(root, "src/shared/schemas"), { recursive: true });
  for (const feature of defaultStripConfig.features) {
    fs.writeFileSync(
      path.join(root, "src/shared/schemas", `${feature}.ts`),
      `export const ${feature}Schema = true;\n`,
    );
  }
  fs.writeFileSync(
    path.join(root, "src/shared/schemas/username.ts"),
    "export const username = true;\n",
  );

  // Routes
  fs.mkdirSync(
    path.join(root, "src/routes/_app/_auth/dashboard"),
    { recursive: true },
  );
  const routeFiles = [
    "_layout.tsx",
    "_layout.index.tsx",
    "_layout.tasks.tsx",
    "_layout.team-pool.tsx",
    "_layout.projects.index.tsx",
    "_layout.projects.$projectId.tsx",
    "_layout.todos.tsx",
    "_layout.tickets.tsx",
    "_layout.contacts.tsx",
    "_layout.settings.tsx",
  ];
  for (const route of routeFiles) {
    fs.writeFileSync(
      path.join(root, "src/routes/_app/_auth/dashboard", route),
      `export default function() { return null; }\n`,
    );
  }

  // Locales
  for (const lang of ["en", "es"]) {
    fs.mkdirSync(path.join(root, "public/locales", lang), {
      recursive: true,
    });
    const allNs = [
      "common",
      "auth",
      "dashboard",
      ...defaultStripConfig.features.map(
        (f) => defaultStripConfig.i18nNamespaceMap[f] ?? f,
      ),
    ];
    for (const ns of allNs) {
      fs.writeFileSync(
        path.join(root, `public/locales/${lang}/${ns}.json`),
        `{ "nav": "${ns}" }\n`,
      );
    }
  }

  // Schema.ts wiring file
  fs.writeFileSync(
    path.join(root, "convex/schema.ts"),
    `import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
  }).index("email", ["email"]),
  devEmails: defineTable({
    to: v.array(v.string()),
    subject: v.string(),
    html: v.string(),
    sentAt: v.number(),
  }).index("sentAt", ["sentAt"]),
  tasks: defineTable({
    title: v.string(),
  }),
  projects: defineTable({
    name: v.string(),
  }),
  subtasks: defineTable({
    title: v.string(),
  }),
  workLogs: defineTable({
    body: v.string(),
  }),
  activityLogs: defineTable({
    entityId: v.string(),
  }),
  todos: defineTable({
    title: v.string(),
  }),
  tickets: defineTable({
    title: v.string(),
  }),
  contacts: defineTable({
    name: v.string(),
  }),
});
export default schema;
`,
  );

  // Nav.ts wiring file (multi-line format to match real project)
  fs.writeFileSync(
    path.join(root, "src/shared/nav.ts"),
    `export const navItems = [
  {
    label: "Dashboard",
    i18nKey: "dashboard.nav.dashboard",
    to: "/dashboard",
  },
  {
    label: "My Tasks",
    i18nKey: "tasks.nav.myTasks",
    to: "/dashboard/tasks",
  },
  {
    label: "Team Pool",
    i18nKey: "tasks.nav.teamPool",
    to: "/dashboard/team-pool",
  },
  {
    label: "Projects",
    i18nKey: "projects.nav.projects",
    to: "/dashboard/projects",
  },
  {
    label: "Todos",
    i18nKey: "todos.nav.todos",
    to: "/dashboard/todos",
  },
  {
    label: "Tickets",
    i18nKey: "tickets.nav.tickets",
    to: "/dashboard/tickets",
  },
  {
    label: "Contacts",
    i18nKey: "contacts.nav.contacts",
    to: "/dashboard/contacts",
  },
  {
    label: "Settings",
    i18nKey: "dashboard.nav.settings",
    to: "/dashboard/settings",
  },
];
`,
  );

  // Errors.ts wiring file
  fs.writeFileSync(
    path.join(root, "src/shared/errors.ts"),
    `export const ERRORS = {
  auth: { EMAIL_NOT_SENT: "Unable to send email." },
  common: { UNKNOWN: "Unknown error." },
  tasks: { NOT_FOUND: "Task not found." },
  projects: { NOT_FOUND: "Project not found." },
  subtasks: { NOT_FOUND: "Subtask not found." },
  workLogs: { NOT_FOUND: "Work log not found." },
  activityLogs: { NOT_FOUND: "Activity log not found." },
  todos: { NOT_FOUND: "Todo not found." },
  tickets: { NOT_FOUND: "Ticket not found." },
  contacts: { NOT_FOUND: "Contact not found." },
} as const;
`,
  );

  // i18n.ts wiring file
  fs.writeFileSync(
    path.join(root, "src/i18n.ts"),
    `const ns = ["common", "auth", "dashboard", "settings", "onboarding", "tasks", "projects", "subtasks", "work-logs", "activity-logs", "todos", "tickets", "contacts"];
export default ns;
`,
  );

  // Example bundles (simplified for tests)
  createExampleBundle(root, "todos");
  createExampleBundle(root, "tickets");
  createExampleBundle(root, "contacts");

  // Branding files
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify(
      { name: "feather-starter-convex", version: "0.0.0" },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(root, "site.config.ts"),
    `export default {
  siteTitle: "Feather Starter",
  siteDescription: "A lightweight, production-ready starter template powered by Convex and React.",
};
`,
  );
}

function createExampleBundle(root: string, name: string): void {
  const exampleDir = path.join(root, "templates/features", name);
  fs.mkdirSync(path.join(exampleDir, "frontend/components"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(exampleDir, "backend"), { recursive: true });
  fs.mkdirSync(path.join(exampleDir, "schema"), { recursive: true });
  fs.mkdirSync(path.join(exampleDir, "route"), { recursive: true });
  fs.mkdirSync(path.join(exampleDir, "locales/en"), { recursive: true });
  fs.mkdirSync(path.join(exampleDir, "locales/es"), { recursive: true });

  fs.writeFileSync(
    path.join(exampleDir, "frontend/index.ts"),
    `export const ${name} = true;\n`,
  );
  fs.writeFileSync(
    path.join(exampleDir, "frontend/components/Page.tsx"),
    "export default function() { return null; }\n",
  );
  fs.writeFileSync(
    path.join(exampleDir, "backend/mutations.ts"),
    `export const ${name}Mutations = true;\n`,
  );
  fs.writeFileSync(
    path.join(exampleDir, `schema/${name}.ts`),
    `export const ${name}Schema = true;\n`,
  );
  fs.writeFileSync(
    path.join(exampleDir, `route/_layout.${name}.tsx`),
    "export default function() { return null; }\n",
  );
  fs.writeFileSync(
    path.join(exampleDir, `locales/en/${name}.json`),
    `{ "nav": "${name}" }\n`,
  );
  fs.writeFileSync(
    path.join(exampleDir, `locales/es/${name}.json`),
    `{ "nav": "${name}" }\n`,
  );

  fs.writeFileSync(
    path.join(exampleDir, "manifest.json"),
    JSON.stringify(
      {
        name,
        label: name.charAt(0).toUpperCase() + name.slice(1),
        description: `${name} example`,
        complexity: "simple",
        files: {
          frontend: `src/features/${name}/`,
          backend: `convex/${name}/`,
          schema: `src/shared/schemas/${name}.ts`,
          route: `src/routes/_app/_auth/dashboard/_layout.${name}.tsx`,
          locales: [
            `public/locales/en/${name}.json`,
            `public/locales/es/${name}.json`,
          ],
        },
        wiring: {
          schemaTable: name,
          navEntry: {
            label: name.charAt(0).toUpperCase() + name.slice(1),
            i18nKey: `${name}.nav.${name}`,
            to: `/dashboard/${name}`,
          },
          i18nNamespace: name,
        },
      },
      null,
      2,
    ),
  );
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("V1: stripped base project has valid structure", () => {
  test("should have no feature directories after stripping", async () => {
    createFullProjectSnapshot(tmpDir);
    await stripToBase(tmpDir);

    for (const feature of defaultStripConfig.features) {
      expect(
        fs.existsSync(path.join(tmpDir, "src/features", feature)),
      ).toBe(false);
    }
  });

  test("should keep infrastructure directories after stripping", async () => {
    createFullProjectSnapshot(tmpDir);
    await stripToBase(tmpDir);

    for (const infra of defaultStripConfig.infraFeatures) {
      expect(
        fs.existsSync(path.join(tmpDir, "src/features", infra)),
      ).toBe(true);
    }
  });

  test("should have only infra tables in schema.ts", async () => {
    createFullProjectSnapshot(tmpDir);
    await stripToBase(tmpDir);

    const schema = fs.readFileSync(
      path.join(tmpDir, "convex/schema.ts"),
      "utf-8",
    );
    expect(schema).toContain("authTables");
    expect(schema).toContain("users:");
    expect(schema).toContain("devEmails:");
    expect(schema).not.toMatch(/^\s+tasks:/m);
    expect(schema).not.toMatch(/^\s+todos:/m);
  });

  test("should have only infra nav entries", async () => {
    createFullProjectSnapshot(tmpDir);
    await stripToBase(tmpDir);

    const nav = fs.readFileSync(
      path.join(tmpDir, "src/shared/nav.ts"),
      "utf-8",
    );
    expect(nav).toContain('"/dashboard"');
    expect(nav).toContain("/dashboard/settings");
    expect(nav).not.toContain("/dashboard/tasks");
    expect(nav).not.toContain("/dashboard/todos");
  });
});

describe("V2: adding a feature produces valid project", () => {
  test("should install todos with all files after stripping", async () => {
    createFullProjectSnapshot(tmpDir);
    await stripToBase(tmpDir);

    const result = await addAction("todos", {}, tmpDir);

    expect(result.success).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/todos/index.ts")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, "convex/todos/mutations.ts")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, "src/shared/schemas/todos.ts"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          tmpDir,
          "src/routes/_app/_auth/dashboard/_layout.todos.tsx",
        ),
      ),
    ).toBe(true);
  });
});

describe("V3: adding all examples restores feature code", () => {
  test("should have all example dirs after strip + add all", async () => {
    createFullProjectSnapshot(tmpDir);
    await stripToBase(tmpDir);

    for (const name of ["todos", "tickets", "contacts"]) {
      await addAction(name, {}, tmpDir);
    }

    for (const name of ["todos", "tickets", "contacts"]) {
      expect(
        fs.existsSync(
          path.join(tmpDir, `src/features/${name}/index.ts`),
        ),
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(tmpDir, `convex/${name}/mutations.ts`),
        ),
      ).toBe(true);
    }
  });
});

describe("V4: add then remove is clean round-trip", () => {
  test("should match stripped state after add+remove", async () => {
    createFullProjectSnapshot(tmpDir);
    await stripToBase(tmpDir);

    // Capture stripped state
    const strippedSchemas = fs.readdirSync(
      path.join(tmpDir, "src/shared/schemas"),
    );

    // Add then remove
    await addAction("todos", {}, tmpDir);
    removeAction("todos", { confirm: true }, tmpDir);

    // State should match stripped
    expect(
      fs.readdirSync(path.join(tmpDir, "src/shared/schemas")),
    ).toEqual(strippedSchemas);
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/todos/")),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(tmpDir, "convex/todos/")),
    ).toBe(false);
  });
});

describe("V5: auth templates produce valid configurations", () => {
  test("should select correct template for each combination", () => {
    expect(getAuthTemplate({ providers: ["password"] })).toBe(
      "password-only",
    );
    expect(
      getAuthTemplate({ providers: ["password", "otp"] }),
    ).toBe("password-otp");
    expect(
      getAuthTemplate({ providers: ["password", "otp", "github"] }),
    ).toBe("password-otp-github");
    expect(
      getAuthTemplate({ providers: ["password", "github"] }),
    ).toBe("password-otp-github");
  });
});

describe("V6: strip is idempotent", () => {
  test("should produce same result when run twice", async () => {
    createFullProjectSnapshot(tmpDir);

    await stripToBase(tmpDir);
    const schemaFirst = fs.readFileSync(
      path.join(tmpDir, "convex/schema.ts"),
      "utf-8",
    );
    const navFirst = fs.readFileSync(
      path.join(tmpDir, "src/shared/nav.ts"),
      "utf-8",
    );

    await stripToBase(tmpDir);
    const schemaSecond = fs.readFileSync(
      path.join(tmpDir, "convex/schema.ts"),
      "utf-8",
    );
    const navSecond = fs.readFileSync(
      path.join(tmpDir, "src/shared/nav.ts"),
      "utf-8",
    );

    expect(schemaSecond).toBe(schemaFirst);
    expect(navSecond).toBe(navFirst);
  });
});

describe("V7: branding replacement works correctly", () => {
  test("should replace branding strings in project files", () => {
    createFullProjectSnapshot(tmpDir);

    const count = applyBranding({
      projectRoot: tmpDir,
      projectName: "my-cool-app",
      appDisplayName: "My Cool App",
    });

    expect(count).toBeGreaterThan(0);

    // package.json name changed
    const pkg = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "package.json"), "utf-8"),
    );
    expect(pkg.name).toBe("my-cool-app");

    // site.config.ts title changed
    const siteConfig = fs.readFileSync(
      path.join(tmpDir, "site.config.ts"),
      "utf-8",
    );
    expect(siteConfig).toContain("My Cool App");
    expect(siteConfig).not.toContain("Feather Starter");
  });
});

// ── Build verification ──────────────────────────────────────────────────────
// Validates the current project (with all features installed) typechecks and
// builds successfully. Runs against the real codebase, not a temp scaffold.

describe("Build verification", () => {
  afterAll(() => {
    fs.rmSync(path.join(process.cwd(), "dist"), {
      recursive: true,
      force: true,
    });
  });

  test(
    "typecheck passes for all tsconfigs",
    () => {
      try {
        execSync("npm run typecheck", {
          encoding: "utf-8",
          timeout: 60_000,
          cwd: process.cwd(),
        });
      } catch (error) {
        const err = error as { stderr?: string; stdout?: string };
        throw new Error(
          `Typecheck failed:\n${err.stderr ?? err.stdout ?? "unknown error"}`,
        );
      }
    },
    65_000,
  );

  test(
    "vite build succeeds",
    () => {
      try {
        execSync("npm run build", {
          encoding: "utf-8",
          timeout: 60_000,
          cwd: process.cwd(),
        });
      } catch (error) {
        const err = error as { stderr?: string; stdout?: string };
        throw new Error(
          `Build failed:\n${err.stderr ?? err.stdout ?? "unknown error"}`,
        );
      }
    },
    65_000,
  );
});
