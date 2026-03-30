import * as fs from "node:fs";
import * as path from "node:path";
import { pascalCase } from "change-case";
import type { FeatureYaml } from "../schema/feather-yaml.schema";
import { renderFeatureTemplates, renderCrossEntityPanels } from "./render";

// ── Scaffold types ───────────────────────────────────────────────────────────

export interface ScaffoldOptions {
  projectRoot: string;
  outputMode: "generated" | "legacy";
  dryRun: boolean;
  /** Map of source entity name → FeatureYaml for cross-entity panel rendering */
  relatedYamls?: Map<string, FeatureYaml>;
}

export interface ScaffoldResult {
  files: string[];
  outputDir: string;
}

// ── Output path resolution ───────────────────────────────────────────────────

function resolveFrontendDir(
  name: string,
  projectRoot: string,
  outputMode: "generated" | "legacy",
): string {
  if (outputMode === "generated") {
    return path.join(projectRoot, "src", "generated", name);
  }
  return path.join(projectRoot, "src", "features", name);
}

function resolveBackendDir(
  name: string,
  projectRoot: string,
  outputMode: "generated" | "legacy",
): string {
  if (outputMode === "generated") {
    return path.join(projectRoot, "convex", "generated", name);
  }
  return path.join(projectRoot, "convex", name);
}

// ── Generated file header ────────────────────────────────────────────────────

const GENERATED_HEADER =
  "// @generated — DO NOT EDIT. Customize in src/custom/";

function generatedHeader(featureName: string): string {
  return `${GENERATED_HEADER}${featureName}/\n\n`;
}

// ── Output key → absolute path mapping ──────────────────────────────────────

/**
 * Map a template output key to an absolute file path.
 *
 * Keys come from renderFeatureTemplates():
 *  - "schema.fragment.ts"          → backendDir/schema.fragment.ts
 *  - "mutations.ts"                → backendDir/mutations.ts
 *  - "queries.ts"                  → backendDir/queries.ts
 *  - "mutations.test.ts"           → backendDir/mutations.test.ts
 *  - "queries.test.ts"             → backendDir/queries.test.ts
 *  - "components/XxxPage.tsx"      → frontendDir/components/XxxPage.tsx
 *  - "hooks/useXxx.ts"             → frontendDir/hooks/useXxx.ts
 *  - "index.ts"                    → frontendDir/index.ts
 *  - "xxx.test.tsx"                → frontendDir/xxx.test.tsx
 *  - "README.md"                   → frontendDir/README.md
 *  - "locales/en/xxx.json"         → projectRoot/public/locales/en/xxx.json
 *  - "locales/es/xxx.json"         → projectRoot/public/locales/es/xxx.json
 */
function resolveOutputPath(
  outputKey: string,
  frontendDir: string,
  backendDir: string,
  projectRoot: string,
): string {
  // Backend files
  const backendKeys = [
    "schema.fragment.ts",
    "mutations.ts",
    "queries.ts",
    "mutations.test.ts",
    "queries.test.ts",
  ];

  if (backendKeys.includes(outputKey)) {
    return path.join(backendDir, outputKey);
  }

  // Locale files live in public/locales/
  if (outputKey.startsWith("locales/")) {
    // "locales/en/todos.json" → "public/locales/en/todos.json"
    const relLocale = outputKey.replace(/^locales\//, "");
    return path.join(projectRoot, "public", "locales", relLocale);
  }

  // Everything else lives under frontendDir
  return path.join(frontendDir, outputKey);
}

// ── Main scaffold function ───────────────────────────────────────────────────

export async function scaffoldFeature(
  config: FeatureYaml,
  options: ScaffoldOptions,
): Promise<ScaffoldResult> {
  const frontendDir = resolveFrontendDir(
    config.name,
    options.projectRoot,
    options.outputMode,
  );
  const backendDir = resolveBackendDir(
    config.name,
    options.projectRoot,
    options.outputMode,
  );

  // Locate templates/feature/ directory relative to this file
  const templateDir = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "..",
    "feature",
  );
  const crossEntityTemplateDir = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "..",
    "cross-entity",
  );

  // Render all templates
  const rendered = renderFeatureTemplates(config, templateDir);

  // Render cross-entity panel templates if feature has detailView
  if (config.detailView) {
    const panelRendered = renderCrossEntityPanels(
      config,
      options.relatedYamls ?? new Map(),
      crossEntityTemplateDir,
    );
    for (const [key, content] of panelRendered) {
      rendered.set(key, content);
    }
  }

  // Build file list with absolute paths
  const files: Array<{ path: string; content: string }> = [];

  for (const [outputKey, content] of rendered) {
    const filePath = resolveOutputPath(
      outputKey,
      frontendDir,
      backendDir,
      options.projectRoot,
    );

    // Prepend generated header when in generated mode
    const finalContent =
      options.outputMode === "generated"
        ? generatedHeader(config.name) + content
        : content;

    files.push({ path: filePath, content: finalContent });
  }

  if (options.dryRun) {
    return {
      files: files.map((f) => f.path),
      outputDir: frontendDir,
    };
  }

  // Write files to disk
  for (const file of files) {
    const dir = path.dirname(file.path);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file.path, file.content, "utf-8");
  }

  return {
    files: files.map((f) => f.path),
    outputDir: frontendDir,
  };
}

// Re-export for test introspection
export { pascalCase };
