import { describe, test, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  buildDependencyGraph,
  topoSort,
  validateDependencies,
} from "../lib/topo-sort";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "toposort-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Create a feather.yaml with optional belongs_to relationships in a temp directory.
 * Supports both root-level and nested (frontend/) locations.
 */
function createFeatureYaml(
  templatesDir: string,
  name: string,
  belongsTo: { target: string; column: string }[] = [],
  nested = false,
): void {
  const dir = nested
    ? path.join(templatesDir, name, "frontend")
    : path.join(templatesDir, name);
  fs.mkdirSync(dir, { recursive: true });

  let yaml = `name: ${name}\nlabel: ${name}\n`;
  if (belongsTo.length > 0) {
    yaml += "relationships:\n";
    for (const rel of belongsTo) {
      yaml += `  ${rel.column}:\n`;
      yaml += `    type: belongs_to\n`;
      yaml += `    target: ${rel.target}\n`;
      yaml += `    column: ${rel.column}\n`;
    }
  }

  fs.writeFileSync(path.join(dir, "feather.yaml"), yaml);
}

describe("buildDependencyGraph", () => {
  test("should extract belongs_to dependencies from feather.yaml", () => {
    createFeatureYaml(tmpDir, "tasks", [
      { target: "projects", column: "projectId" },
    ]);
    createFeatureYaml(tmpDir, "projects");
    createFeatureYaml(tmpDir, "subtasks", [
      { target: "tasks", column: "taskId" },
    ]);

    const graph = buildDependencyGraph(
      ["tasks", "projects", "subtasks"],
      tmpDir,
    );

    expect(graph).toEqual({
      tasks: ["projects"],
      projects: [],
      subtasks: ["tasks"],
    });
  });

  test("should return empty deps for feature with no feather.yaml", () => {
    // Create directory but no feather.yaml
    fs.mkdirSync(path.join(tmpDir, "unknown-feature"), { recursive: true });

    const graph = buildDependencyGraph(["unknown-feature"], tmpDir);

    expect(graph).toEqual({ "unknown-feature": [] });
  });

  test("should find feather.yaml in nested frontend/ directory", () => {
    createFeatureYaml(
      tmpDir,
      "contacts",
      [{ target: "organizations", column: "orgId" }],
      true, // nested in frontend/
    );

    const graph = buildDependencyGraph(["contacts"], tmpDir);

    expect(graph).toEqual({ contacts: ["organizations"] });
  });
});

describe("topoSort", () => {
  test("should return correct install order (dependencies first)", () => {
    const graph = {
      tasks: ["projects"],
      projects: [],
      subtasks: ["tasks"],
    };

    const order = topoSort(graph);

    // projects must come before tasks, tasks before subtasks
    expect(order.indexOf("projects")).toBeLessThan(order.indexOf("tasks"));
    expect(order.indexOf("tasks")).toBeLessThan(order.indexOf("subtasks"));
    expect(order).toHaveLength(3);
  });

  test("should detect circular dependency and throw descriptive error", () => {
    const graph = {
      a: ["b"],
      b: ["a"],
    };

    expect(() => topoSort(graph)).toThrow("Circular dependency");
  });

  test("should handle single feature with no dependencies", () => {
    const graph = { solo: [] };

    const order = topoSort(graph);

    expect(order).toEqual(["solo"]);
  });

  test("should handle disconnected features (no shared dependencies)", () => {
    const graph = {
      alpha: [],
      beta: [],
      gamma: [],
    };

    const order = topoSort(graph);

    expect(order).toHaveLength(3);
    expect(order).toContain("alpha");
    expect(order).toContain("beta");
    expect(order).toContain("gamma");
  });

  test("should handle diamond dependency graph", () => {
    // D depends on B and C, both depend on A
    const graph = {
      d: ["b", "c"],
      b: ["a"],
      c: ["a"],
      a: [],
    };

    const order = topoSort(graph);

    expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("c"));
    expect(order.indexOf("b")).toBeLessThan(order.indexOf("d"));
    expect(order.indexOf("c")).toBeLessThan(order.indexOf("d"));
  });
});

describe("validateDependencies", () => {
  test("should return valid when all deps are in graph", () => {
    const graph = {
      tasks: ["projects"],
      projects: [],
    };

    const result = validateDependencies(graph, []);

    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  test("should return valid when deps are in installed features", () => {
    const graph = {
      subtasks: ["tasks"],
    };

    const result = validateDependencies(graph, ["tasks"]);

    expect(result.valid).toBe(true);
  });

  test("should detect missing external dependency", () => {
    const graph = {
      subtasks: ["tasks"],
    };

    const result = validateDependencies(graph, []);

    expect(result.valid).toBe(false);
    expect(result.missing).toEqual([
      { feature: "subtasks", dependency: "tasks" },
    ]);
  });

  test("should report all missing dependencies", () => {
    const graph = {
      a: ["x", "y"],
      b: ["z"],
    };

    const result = validateDependencies(graph, []);

    expect(result.valid).toBe(false);
    expect(result.missing).toHaveLength(3);
  });
});
