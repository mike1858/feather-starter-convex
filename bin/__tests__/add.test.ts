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

function createMinimalProjectWithTemplates(root: string): void {
  // Project directories
  fs.mkdirSync(path.join(root, "src/shared/schemas"), { recursive: true });
  fs.mkdirSync(path.join(root, "src/routes/_app/_auth/dashboard"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(root, "convex"), { recursive: true });
  fs.mkdirSync(path.join(root, "public/locales/en"), { recursive: true });
  fs.mkdirSync(path.join(root, "public/locales/es"), { recursive: true });

  // Create a bundled example
  const exampleDir = path.join(root, "templates/features/todos");
  fs.mkdirSync(path.join(exampleDir, "frontend/components"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(exampleDir, "backend"), { recursive: true });
  fs.mkdirSync(path.join(exampleDir, "schema"), { recursive: true });
  fs.mkdirSync(path.join(exampleDir, "route"), { recursive: true });
  fs.mkdirSync(path.join(exampleDir, "locales/en"), { recursive: true });
  fs.mkdirSync(path.join(exampleDir, "locales/es"), { recursive: true });

  // Files
  fs.writeFileSync(
    path.join(exampleDir, "frontend/index.ts"),
    "export const todos = true;\n",
  );
  fs.writeFileSync(
    path.join(exampleDir, "frontend/components/Page.tsx"),
    "export default function() { return null; }\n",
  );
  fs.writeFileSync(
    path.join(exampleDir, "backend/mutations.ts"),
    "export const mutations = true;\n",
  );
  fs.writeFileSync(
    path.join(exampleDir, "schema/todos.ts"),
    "export const todosSchema = true;\n",
  );
  fs.writeFileSync(
    path.join(exampleDir, "route/_layout.todos.tsx"),
    "export default function() { return null; }\n",
  );
  fs.writeFileSync(
    path.join(exampleDir, "locales/en/todos.json"),
    '{ "nav": "Todos" }\n',
  );
  fs.writeFileSync(
    path.join(exampleDir, "locales/es/todos.json"),
    '{ "nav": "Tareas" }\n',
  );

  // Manifest
  fs.writeFileSync(
    path.join(exampleDir, "manifest.json"),
    JSON.stringify(
      {
        name: "todos",
        label: "Todos",
        description: "Simple CRUD",
        complexity: "simple",
        files: {
          frontend: "src/features/todos/",
          backend: "convex/todos/",
          schema: "src/shared/schemas/todos.ts",
          route: "src/routes/_app/_auth/dashboard/_layout.todos.tsx",
          locales: [
            "public/locales/en/todos.json",
            "public/locales/es/todos.json",
          ],
        },
        wiring: {
          schemaTable: "todos",
          navEntry: {
            label: "Todos",
            i18nKey: "todos.nav.todos",
            to: "/dashboard/todos",
          },
          i18nNamespace: "todos",
        },
      },
      null,
      2,
    ),
  );
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
