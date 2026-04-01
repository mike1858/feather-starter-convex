import { describe, test, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { listAction } from "../commands/list";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "list-test-"));
  createMinimalProject(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Create a minimal feature template with manifest.json */
function createFeatureTemplate(root: string, name: string): void {
  const featureDir = path.join(root, "templates/features", name);
  fs.mkdirSync(path.join(featureDir, "frontend"), { recursive: true });
  fs.writeFileSync(
    path.join(featureDir, "manifest.json"),
    JSON.stringify({ name, label: name, description: `${name} feature`, complexity: "simple", files: { frontend: `src/features/${name}/` }, wiring: {} }, null, 2),
  );
}

/** Create a bundle manifest */
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

/** Simulate an installed feature by creating its src/features/{name}/ directory */
function simulateInstalled(root: string, name: string): void {
  fs.mkdirSync(path.join(root, "src/features", name), { recursive: true });
}

function createMinimalProject(root: string): void {
  fs.mkdirSync(path.join(root, "src/features"), { recursive: true });
  fs.mkdirSync(path.join(root, "templates/features"), { recursive: true });
  fs.mkdirSync(path.join(root, "templates/bundles"), { recursive: true });
}

describe("listAction", () => {
  test("should return installed features", () => {
    simulateInstalled(tmpDir, "todos");
    simulateInstalled(tmpDir, "tickets");

    const result = listAction(tmpDir);

    expect(result.installed).toContain("todos");
    expect(result.installed).toContain("tickets");
  });

  test("should return available features (not yet installed)", () => {
    createFeatureTemplate(tmpDir, "todos");
    createFeatureTemplate(tmpDir, "widgets");
    simulateInstalled(tmpDir, "todos"); // todos is installed

    const result = listAction(tmpDir);

    expect(result.availableFeatures).toContain("widgets");
    expect(result.availableFeatures).not.toContain("todos");
  });

  test("should return available bundles with metadata", () => {
    createFeatureTemplate(tmpDir, "todos");
    createFeatureTemplate(tmpDir, "widgets");
    createBundleTemplate(tmpDir, "test-bundle", ["todos", "widgets"]);

    const result = listAction(tmpDir);

    expect(result.availableBundles).toHaveLength(1);
    expect(result.availableBundles[0].name).toBe("test-bundle");
    expect(result.availableBundles[0].featureCount).toBe(2);
  });

  test("should return empty lists when no templates dir exists", () => {
    // Create a project with no templates
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "list-empty-"));
    fs.mkdirSync(path.join(emptyDir, "src/features"), { recursive: true });

    try {
      const result = listAction(emptyDir);

      expect(result.installed).toEqual([]);
      expect(result.availableFeatures).toEqual([]);
      expect(result.availableBundles).toEqual([]);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  test("should mark bundle as installed when ALL features are installed", () => {
    createFeatureTemplate(tmpDir, "todos");
    createFeatureTemplate(tmpDir, "widgets");
    createBundleTemplate(tmpDir, "test-bundle", ["todos", "widgets"]);

    // Install all features in the bundle
    simulateInstalled(tmpDir, "todos");
    simulateInstalled(tmpDir, "widgets");

    const result = listAction(tmpDir);

    expect(result.availableBundles[0].installed).toBe(true);
  });

  test("should mark bundle as not installed when only some features are installed", () => {
    createFeatureTemplate(tmpDir, "todos");
    createFeatureTemplate(tmpDir, "widgets");
    createBundleTemplate(tmpDir, "test-bundle", ["todos", "widgets"]);

    // Only install one feature
    simulateInstalled(tmpDir, "todos");

    const result = listAction(tmpDir);

    expect(result.availableBundles[0].installed).toBe(false);
  });

  test("should include feature count per bundle", () => {
    createFeatureTemplate(tmpDir, "a");
    createFeatureTemplate(tmpDir, "b");
    createFeatureTemplate(tmpDir, "c");
    createBundleTemplate(tmpDir, "three-pack", ["a", "b", "c"]);

    const result = listAction(tmpDir);

    expect(result.availableBundles[0].featureCount).toBe(3);
  });
});
