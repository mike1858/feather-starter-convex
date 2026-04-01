import { describe, test, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { resolve, bundleManifestSchema } from "../lib/resolve";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function createFeature(root: string, name: string): void {
  const dir = path.join(root, "templates/features", name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "manifest.json"),
    JSON.stringify({ name, label: name, description: "test", complexity: "simple" }),
  );
}

function createBundle(root: string, name: string, features: string[]): void {
  const dir = path.join(root, "templates/bundles", name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "bundle.json"),
    JSON.stringify({
      name,
      label: name,
      description: "test bundle",
      complexity: "advanced",
      features,
    }),
  );
}

describe("bundleManifestSchema", () => {
  test("should validate a correct bundle manifest", () => {
    const valid = {
      name: "project-management",
      label: "Project Management",
      description: "Tasks and projects",
      complexity: "advanced",
      features: ["tasks", "projects"],
    };
    expect(() => bundleManifestSchema.parse(valid)).not.toThrow();
  });

  test("should reject manifest with empty features array", () => {
    const invalid = {
      name: "empty",
      label: "Empty",
      description: "No features",
      complexity: "simple",
      features: [],
    };
    expect(() => bundleManifestSchema.parse(invalid)).toThrow();
  });

  test("should reject manifest with invalid complexity", () => {
    const invalid = {
      name: "test",
      label: "Test",
      description: "test",
      complexity: "expert",
      features: ["a"],
    };
    expect(() => bundleManifestSchema.parse(invalid)).toThrow();
  });
});

describe("resolve", () => {
  test("should return bundle resolution when bundle.json exists", () => {
    createBundle(tmpDir, "project-management", ["tasks", "projects"]);

    const result = resolve("project-management", tmpDir);

    expect(result.type).toBe("bundle");
    if (result.type === "bundle") {
      expect(result.manifest.name).toBe("project-management");
      expect(result.manifest.features).toEqual(["tasks", "projects"]);
    }
  });

  test("should return feature resolution when only feature manifest exists", () => {
    createFeature(tmpDir, "todos");

    const result = resolve("todos", tmpDir);

    expect(result.type).toBe("feature");
    if (result.type === "feature") {
      expect(result.manifest.name).toBe("todos");
    }
  });

  test("should return not-found for nonexistent name", () => {
    const result = resolve("nonexistent", tmpDir);

    expect(result.type).toBe("not-found");
    if (result.type === "not-found") {
      expect(result.name).toBe("nonexistent");
    }
  });

  test("should check bundles BEFORE features (bundle wins on name collision)", () => {
    // Create both a bundle and a feature with the same name
    createBundle(tmpDir, "todos", ["todos-basic"]);
    createFeature(tmpDir, "todos");

    const result = resolve("todos", tmpDir);

    // Bundle should win per D-03
    expect(result.type).toBe("bundle");
  });
});
