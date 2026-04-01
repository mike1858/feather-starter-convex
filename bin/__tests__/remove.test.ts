import { describe, test, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { addAction } from "../commands/add";
import { removeAction } from "../commands/remove";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "remove-test-"));
  createMinimalProjectWithTemplates(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Create a minimal feature template in templates/features/{name}/ */
function createFeatureTemplate(root: string, name: string): void {
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

describe("removeAction", () => {
  test("should remove all feature files", () => {
    // First install
    addAction("todos", {}, tmpDir);
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/todos/")),
    ).toBe(true);

    // Then remove
    const result = removeAction("todos", { confirm: true }, tmpDir);

    expect(result.success).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/todos/")),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(tmpDir, "convex/todos/")),
    ).toBe(false);
  });

  test("should remove schema file", () => {
    addAction("todos", {}, tmpDir);
    removeAction("todos", { confirm: true }, tmpDir);

    expect(
      fs.existsSync(path.join(tmpDir, "src/shared/schemas/todos.ts")),
    ).toBe(false);
  });

  test("should remove route file", () => {
    addAction("todos", {}, tmpDir);
    removeAction("todos", { confirm: true }, tmpDir);

    expect(
      fs.existsSync(
        path.join(
          tmpDir,
          "src/routes/_app/_auth/dashboard/_layout.todos.tsx",
        ),
      ),
    ).toBe(false);
  });

  test("should remove locale files", () => {
    addAction("todos", {}, tmpDir);
    removeAction("todos", { confirm: true }, tmpDir);

    expect(
      fs.existsSync(path.join(tmpDir, "public/locales/en/todos.json")),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(tmpDir, "public/locales/es/todos.json")),
    ).toBe(false);
  });

  test("should fail if feature is not installed", () => {
    const result = removeAction("todos", { confirm: true }, tmpDir);

    expect(result.success).toBe(false);
    expect(result.message).toContain("not installed");
  });

  test("add then remove should be a clean round-trip", () => {
    // Capture initial state of the project directories
    const initialSchemas = fs.readdirSync(
      path.join(tmpDir, "src/shared/schemas"),
    );
    const initialRoutes = fs.readdirSync(
      path.join(tmpDir, "src/routes/_app/_auth/dashboard"),
    );
    const initialEnLocales = fs.readdirSync(
      path.join(tmpDir, "public/locales/en"),
    );

    // Add then remove
    addAction("todos", {}, tmpDir);
    removeAction("todos", { confirm: true }, tmpDir);

    // Verify state matches initial
    expect(
      fs.readdirSync(path.join(tmpDir, "src/shared/schemas")),
    ).toEqual(initialSchemas);
    expect(
      fs.readdirSync(
        path.join(tmpDir, "src/routes/_app/_auth/dashboard"),
      ),
    ).toEqual(initialRoutes);
    expect(
      fs.readdirSync(path.join(tmpDir, "public/locales/en")),
    ).toEqual(initialEnLocales);
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/todos/")),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(tmpDir, "convex/todos/")),
    ).toBe(false);
  });

  test("should return list of removed file paths", () => {
    addAction("todos", {}, tmpDir);
    const result = removeAction("todos", { confirm: true }, tmpDir);

    expect(result.filesRemoved.length).toBeGreaterThan(0);
    expect(result.filesRemoved).toContain("src/features/todos/");
    expect(result.filesRemoved).toContain("convex/todos/");
  });
});

describe("removeAction — bundle support", () => {
  test("should remove all features in a bundle", () => {
    createFeatureTemplate(tmpDir, "widgets");
    createBundleTemplate(tmpDir, "test-bundle", ["todos", "widgets"]);

    // Install both features
    addAction("test-bundle", {}, tmpDir);
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/todos/")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/widgets/")),
    ).toBe(true);

    // Remove as bundle
    const result = removeAction("test-bundle", { confirm: true }, tmpDir);

    expect(result.success).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/todos/")),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/widgets/")),
    ).toBe(false);
  });

  test("should still work for single feature removal (backward compat)", () => {
    addAction("todos", {}, tmpDir);
    const result = removeAction("todos", { confirm: true }, tmpDir);

    expect(result.success).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/todos/")),
    ).toBe(false);
  });

  test("should handle partial removal when some features not installed", () => {
    createFeatureTemplate(tmpDir, "widgets");
    createBundleTemplate(tmpDir, "test-bundle", ["todos", "widgets"]);

    // Only install todos (not widgets)
    addAction("todos", {}, tmpDir);

    // Remove bundle — todos removed, widgets not found (partial)
    const result = removeAction("test-bundle", { confirm: true }, tmpDir);

    expect(result.success).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, "src/features/todos/")),
    ).toBe(false);
    expect(result.filesRemoved).toContain("src/features/todos/");
  });
});
