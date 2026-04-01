/**
 * Topological sort from belongs_to dependency graph.
 *
 * Reads feather.yaml files to extract belongs_to relationships,
 * builds a dependency graph, and produces install order where
 * dependencies come before dependents.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import YAML from "yaml";

export interface DepGraph {
  [feature: string]: string[];
}

/**
 * Build dependency graph from feather.yaml belongs_to relationships.
 * Checks both `{templatesDir}/{name}/feather.yaml` (root) and
 * `{templatesDir}/{name}/frontend/feather.yaml` (bundled location).
 */
export function buildDependencyGraph(
  features: string[],
  templatesDir: string,
): DepGraph {
  const graph: DepGraph = {};

  for (const name of features) {
    // Check both possible locations (Pitfall 4 from RESEARCH.md)
    const rootYaml = path.join(templatesDir, name, "feather.yaml");
    const nestedYaml = path.join(
      templatesDir,
      name,
      "frontend",
      "feather.yaml",
    );
    const yamlPath = fs.existsSync(rootYaml)
      ? rootYaml
      : fs.existsSync(nestedYaml)
        ? nestedYaml
        : null;

    if (!yamlPath) {
      graph[name] = [];
      continue;
    }

    const parsed = YAML.parse(fs.readFileSync(yamlPath, "utf-8"));
    const deps: string[] = [];

    if (parsed.relationships) {
      for (const rel of Object.values(parsed.relationships)) {
        if ((rel as { type: string }).type === "belongs_to") {
          deps.push((rel as { target: string }).target);
        }
      }
    }

    graph[name] = deps;
  }

  return graph;
}

/**
 * Topological sort with cycle detection. Returns install order where
 * dependencies come before dependents.
 */
export function topoSort(graph: DepGraph): string[] {
  const visited = new Set<string>();
  const visiting = new Set<string>(); // cycle detection
  const result: string[] = [];

  function visit(node: string): void {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      throw new Error(`Circular dependency detected involving: ${node}`);
    }

    visiting.add(node);
    for (const dep of graph[node] ?? []) {
      visit(dep);
    }
    visiting.delete(node);
    visited.add(node);
    result.push(node);
  }

  for (const node of Object.keys(graph)) {
    visit(node);
  }

  return result;
}

/**
 * Validate that all dependencies referenced in the graph are either
 * in the graph itself or already installed. Per D-11.
 */
export function validateDependencies(
  graph: DepGraph,
  installedFeatures: string[],
): { valid: boolean; missing: { feature: string; dependency: string }[] } {
  const available = new Set([...Object.keys(graph), ...installedFeatures]);
  const missing: { feature: string; dependency: string }[] = [];

  for (const [feature, deps] of Object.entries(graph)) {
    for (const dep of deps) {
      if (!available.has(dep)) {
        missing.push({ feature, dependency: dep });
      }
    }
  }

  return { valid: missing.length === 0, missing };
}
