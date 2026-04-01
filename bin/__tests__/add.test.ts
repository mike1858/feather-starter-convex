import { describe, test, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { addAction } from "../commands/add";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "add-test-"));
  createMinimalProjectWithTemplates(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Create a minimal feature template in templates/features/{name}/ */
function createFeatureTemplate(
  root: string,
  name: string,
  opts?: { belongsTo?: string },
): void {
  const featureDir = path.join(root, "templates/features", name);
  fs.mkdirSync(path.join(featureDir, "frontend/components"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(featureDir, "backend"), { recursive: true });
  fs.mkdirSync(path.join(featureDir, "schema"), { recursive: true });
  fs.mkdirSync(path.join(featureDir, "route"), { recursive: true });
  fs.mkdirSync(path.join(featureDir, "locales/en"), { recursive: true });
  fs.mkdirSync(path.join(featureDir, "locales/es"), { recursive: true });

  fs.writeFileSync(
    path.join(featureDir, "frontend/index.ts"),
    `export const ${name} = true;\n`,
  );
  fs.writeFileSync(
    path.join(featureDir, "frontend/components/Page.tsx"),
    "export default function() { return null; }\n",
  );
  fs.writeFileSync(
    path.join(featureDir, "backend/mutations.ts"),
    `export const mutations = true;\n`,
  );
  fs.writeFileSync(
    path.join(featureDir, `schema/${name}.ts`),
    `export const ${name}Schema = true;\n`,
  );
  fs.writeFileSync(
    path.join(featureDir, `route/_layout.${name}.tsx`),
    "export default function() { return null; }\n",
  );
  fs.writeFileSync(
    path.join(featureDir, `locales/en/${name}.json`),
    `{ "nav": "${name}" }\n`,
  );
  fs.writeFileSync(
    path.join(featureDir, `locales/es/${name}.json`),
    `{ "nav": "${name}" }\n`,
  );

  fs.writeFileSync(
    path.join(featureDir, "manifest.json"),
    JSON.stringify(
      {
        name,
        label: name.charAt(0).toUpperCase() + name.slice(1),
        description: `${name} feature`,
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
            label: name,
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

  // Add feather.yaml with belongs_to if specified
  if (opts?.belongsTo) {
    fs.writeFileSync(
      path.join(featureDir, "frontend/feather.yaml"),
      `entity: ${name}\nrelationships:\n  parent:\n    type: belongs_to\n    target: ${opts.belongsTo}\n`,
    );
  }
}

/** Create a bundle manifest in templates/bundles/{name}/bundle.json */
function createBundleTemplate(
  root: string,
  name: string,
  features: string[],
): void {
  const bundleDir = path.join(root, "templates/bundles", name);
  fs.mkdirSync(bundleDir, { recursive: true });
  fs.writeFileSync(
    path.join(bundleDir, "bundle.json"),
    JSON.stringify(
      {
        name,
        label: name.charAt(0).toUpperCase() + name.slice(1),
        description: `${name} bundle`,
        complexity: "intermediate",
        features,
      },
      null,
      2,
    ),
  );
}

function createMinimalProjectWithTemplates(root: string): void {
  // Project directories
  fs.mkdirSync(path.join(root, "src/shared/schemas"), { recursive: true });
  fs.mkdirSync(path.join(root, "src/routes/_app/_auth/dashboard"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(root, "convex"), { recursive: true });
  fs.mkdirSync(path.join(root, "public/locales/en"), { recursive: true });
  fs.mkdirSync(path.join(root, "public/locales/es"), { recursive: true });

  // Create the "todos" feature template
  createFeatureTemplate(root, "todos");
}

describe("addAction", () => {
  test("should install feature files to correct locations", () => {
    const result = addAction("todos", {}, tmpDir);

    expect(result.success).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/todos/index.ts")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, "src/features/todos/components/Page.tsx"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, "convex/todos/mutations.ts")),
    ).toBe(true);
  });

  test("should copy schema file to shared schemas", () => {
    addAction("todos", {}, tmpDir);

    expect(
      fs.existsSync(path.join(tmpDir, "src/shared/schemas/todos.ts")),
    ).toBe(true);
  });

  test("should copy route file to dashboard routes", () => {
    addAction("todos", {}, tmpDir);

    expect(
      fs.existsSync(
        path.join(
          tmpDir,
          "src/routes/_app/_auth/dashboard/_layout.todos.tsx",
        ),
      ),
    ).toBe(true);
  });

  test("should copy locale files", () => {
    addAction("todos", {}, tmpDir);

    expect(
      fs.existsSync(path.join(tmpDir, "public/locales/en/todos.json")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, "public/locales/es/todos.json")),
    ).toBe(true);
  });

  test("should fail if feature already exists without --force", () => {
    // First install
    addAction("todos", {}, tmpDir);

    // Second install without force
    const result = addAction("todos", {}, tmpDir);

    expect(result.success).toBe(false);
    expect(result.message).toContain("already exists");
  });

  test("should overwrite with --force flag", () => {
    // First install
    addAction("todos", {}, tmpDir);

    // Second install with force
    const result = addAction("todos", { force: true }, tmpDir);

    expect(result.success).toBe(true);
  });

  test("should fail for unknown feature name", () => {
    const result = addAction("nonexistent", {}, tmpDir);

    expect(result.success).toBe(false);
    expect(result.message).toContain("not found");
  });

  test("should return list of created file paths", () => {
    const result = addAction("todos", {}, tmpDir);

    expect(result.filesCreated.length).toBeGreaterThan(0);
    expect(result.filesCreated).toContain("src/features/todos/");
    expect(result.filesCreated).toContain("convex/todos/");
  });
});

describe("addAction — bundle support", () => {
  test("should install all features in a bundle in dependency order", () => {
    // Create features: widgets depends on todos
    createFeatureTemplate(tmpDir, "widgets", { belongsTo: "todos" });
    createBundleTemplate(tmpDir, "test-bundle", ["todos", "widgets"]);

    const result = addAction("test-bundle", {}, tmpDir);

    expect(result.success).toBe(true);
    // Both features installed
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/todos/index.ts")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/widgets/index.ts")),
    ).toBe(true);
    // Aggregated files
    expect(result.filesCreated.length).toBeGreaterThan(2);
  });

  test("should still work for single feature (backward compat)", () => {
    const result = addAction("todos", {}, tmpDir);

    expect(result.success).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/todos/index.ts")),
    ).toBe(true);
  });

  test("should update already-installed features in a bundle (per D-10)", () => {
    // Install todos first
    addAction("todos", {}, tmpDir);

    // Create widgets and bundle
    createFeatureTemplate(tmpDir, "widgets");
    createBundleTemplate(tmpDir, "test-bundle", ["todos", "widgets"]);

    // Install bundle — todos already exists, should be updated (not skipped)
    const result = addAction("test-bundle", {}, tmpDir);

    expect(result.success).toBe(true);
    // Both features should be installed/updated
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/todos/index.ts")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/widgets/index.ts")),
    ).toBe(true);
  });

  test("should error when bundle references dependency not in bundle and not installed (per D-11)", () => {
    // Create widgets that depends on "tasks" (not in bundle, not installed)
    createFeatureTemplate(tmpDir, "widgets", { belongsTo: "tasks" });
    createBundleTemplate(tmpDir, "test-bundle", ["widgets"]);

    const result = addAction("test-bundle", {}, tmpDir);

    expect(result.success).toBe(false);
    expect(result.message).toContain("not installed and not in this bundle");
  });

  test("should succeed when dependency IS already installed", () => {
    // Install todos first (it's the dependency)
    addAction("todos", {}, tmpDir);

    // Create widgets that depends on todos
    createFeatureTemplate(tmpDir, "widgets", { belongsTo: "todos" });
    createBundleTemplate(tmpDir, "dep-bundle", ["widgets"]);

    const result = addAction("dep-bundle", {}, tmpDir);

    expect(result.success).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/widgets/index.ts")),
    ).toBe(true);
  });

  test("should aggregate filesCreated across all features in bundle", () => {
    createFeatureTemplate(tmpDir, "widgets");
    createBundleTemplate(tmpDir, "test-bundle", ["todos", "widgets"]);

    const result = addAction("test-bundle", {}, tmpDir);

    expect(result.success).toBe(true);
    // Should contain files from both features
    expect(result.filesCreated).toContain("src/features/todos/");
    expect(result.filesCreated).toContain("src/features/widgets/");
    expect(result.filesCreated).toContain("convex/todos/");
    expect(result.filesCreated).toContain("convex/widgets/");
  });

  test("should show available bundles in not-found error message", () => {
    createBundleTemplate(tmpDir, "test-bundle", ["todos"]);

    const result = addAction("nonexistent", {}, tmpDir);

    expect(result.success).toBe(false);
    expect(result.message).toContain("test-bundle");
  });
});
