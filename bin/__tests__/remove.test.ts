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
