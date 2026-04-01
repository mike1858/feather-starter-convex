import { describe, test, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { scaffoldExamples, readManifest } from "./scaffold";
import type { ExampleManifest } from "./scaffold";

// ── Test fixtures ───────────────────────────────────────────────────────────

let tmpDir: string;
let templatesDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-test-"));
  templatesDir = path.join(tmpDir, "templates/features");

  // Create a minimal "project" directory with wiring files
  const projectDir = path.join(tmpDir, "project");
  fs.mkdirSync(path.join(projectDir, "src/shared/schemas"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(projectDir, "src/routes/_app/_auth/dashboard"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(projectDir, "convex"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, "public/locales/en"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(projectDir, "public/locales/es"), {
    recursive: true,
  });

  // Create a bundled example app (todos)
  createExampleBundle(templatesDir, "todos");
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function createExampleBundle(
  templatesRoot: string,
  name: string,
): void {
  const exampleDir = path.join(templatesRoot, name);

  // manifest.json
  fs.mkdirSync(exampleDir, { recursive: true });
  const manifest: ExampleManifest = {
    name,
    label: name.charAt(0).toUpperCase() + name.slice(1),
    description: `${name} example app`,
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
  };
  fs.writeFileSync(
    path.join(exampleDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );

  // Frontend files
  fs.mkdirSync(path.join(exampleDir, "frontend/components"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(exampleDir, "frontend/index.ts"),
    `export const ${name} = true;\n`,
  );
  fs.writeFileSync(
    path.join(exampleDir, "frontend/components/Page.tsx"),
    `export default function Page() { return null; }\n`,
  );

  // Backend files
  fs.mkdirSync(path.join(exampleDir, "backend"), { recursive: true });
  fs.writeFileSync(
    path.join(exampleDir, "backend/mutations.ts"),
    `export const ${name}Mutations = true;\n`,
  );
  fs.writeFileSync(
    path.join(exampleDir, "backend/queries.ts"),
    `export const ${name}Queries = true;\n`,
  );

  // Schema file
  fs.mkdirSync(path.join(exampleDir, "schema"), { recursive: true });
  fs.writeFileSync(
    path.join(exampleDir, "schema", `${name}.ts`),
    `export const ${name}Schema = true;\n`,
  );

  // Route file
  fs.mkdirSync(path.join(exampleDir, "route"), { recursive: true });
  fs.writeFileSync(
    path.join(exampleDir, "route", `_layout.${name}.tsx`),
    `export default function() { return null; }\n`,
  );

  // Locale files
  fs.mkdirSync(path.join(exampleDir, "locales/en"), { recursive: true });
  fs.mkdirSync(path.join(exampleDir, "locales/es"), { recursive: true });
  fs.writeFileSync(
    path.join(exampleDir, "locales/en", `${name}.json`),
    `{ "nav": { "${name}": "${name}" } }\n`,
  );
  fs.writeFileSync(
    path.join(exampleDir, "locales/es", `${name}.json`),
    `{ "nav": { "${name}": "${name}" } }\n`,
  );
}

function getProjectDir(): string {
  return path.join(tmpDir, "project");
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("scaffoldExamples", () => {
  test("should install example app files to correct locations", async () => {
    const projectDir = getProjectDir();
    const result = await scaffoldExamples({
      projectRoot: projectDir,
      exampleApps: ["todos"],
      templatesDir,
    });

    expect(result.installed).toContain("todos");
    expect(
      fs.existsSync(path.join(projectDir, "src/features/todos/index.ts")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(projectDir, "src/features/todos/components/Page.tsx"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(projectDir, "convex/todos/mutations.ts")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(projectDir, "convex/todos/queries.ts")),
    ).toBe(true);
  });

  test("should copy schema file to correct location", async () => {
    const projectDir = getProjectDir();
    await scaffoldExamples({
      projectRoot: projectDir,
      exampleApps: ["todos"],
      templatesDir,
    });

    expect(
      fs.existsSync(
        path.join(projectDir, "src/shared/schemas/todos.ts"),
      ),
    ).toBe(true);
  });

  test("should copy route file to correct location", async () => {
    const projectDir = getProjectDir();
    await scaffoldExamples({
      projectRoot: projectDir,
      exampleApps: ["todos"],
      templatesDir,
    });

    expect(
      fs.existsSync(
        path.join(
          projectDir,
          "src/routes/_app/_auth/dashboard/_layout.todos.tsx",
        ),
      ),
    ).toBe(true);
  });

  test("should copy locale files to correct locations", async () => {
    const projectDir = getProjectDir();
    await scaffoldExamples({
      projectRoot: projectDir,
      exampleApps: ["todos"],
      templatesDir,
    });

    expect(
      fs.existsSync(
        path.join(projectDir, "public/locales/en/todos.json"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(projectDir, "public/locales/es/todos.json"),
      ),
    ).toBe(true);
  });

  test("should handle empty example apps list", async () => {
    const projectDir = getProjectDir();
    const result = await scaffoldExamples({
      projectRoot: projectDir,
      exampleApps: [],
      templatesDir,
    });

    expect(result.installed).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  test("should report errors for unknown features", async () => {
    const projectDir = getProjectDir();
    const result = await scaffoldExamples({
      projectRoot: projectDir,
      exampleApps: ["nonexistent"],
      templatesDir,
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("nonexistent");
    expect(result.installed).toHaveLength(0);
  });

  test("should skip already installed features", async () => {
    const projectDir = getProjectDir();

    // First install
    await scaffoldExamples({
      projectRoot: projectDir,
      exampleApps: ["todos"],
      templatesDir,
    });

    // Second install should skip
    const result = await scaffoldExamples({
      projectRoot: projectDir,
      exampleApps: ["todos"],
      templatesDir,
    });

    expect(result.installed).toHaveLength(0);
    expect(result.skipped).toContain("todos");
  });

  test("should return accurate installed/skipped/errors counts", async () => {
    const projectDir = getProjectDir();

    // Install todos, skip nonexistent
    const result = await scaffoldExamples({
      projectRoot: projectDir,
      exampleApps: ["todos", "nonexistent"],
      templatesDir,
    });

    expect(result.installed).toEqual(["todos"]);
    expect(result.errors).toHaveLength(1);
  });
});

describe("readManifest", () => {
  test("should read manifest for existing example", () => {
    const manifest = readManifest("todos", templatesDir);
    expect(manifest).not.toBeNull();
    expect(manifest!.name).toBe("todos");
    expect(manifest!.label).toBe("Todos");
  });

  test("should return null for nonexistent example", () => {
    const manifest = readManifest("nonexistent", templatesDir);
    expect(manifest).toBeNull();
  });
});
