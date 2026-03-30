/**
 * Strip all feature code from the project to produce a clean base branch.
 *
 * Usage: npx tsx scripts/strip-to-base.ts
 *
 * The base branch contains only infrastructure (auth, dashboard, onboarding,
 * settings, uploads, UI components, generators, build config) — no features.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { defaultStripConfig, type StripConfig } from "./strip-config";

export interface StripResult {
  deleted: string[];
  modified: string[];
  errors: string[];
}

// ─── Directory and file deletion ────────────────────────────────────────────

function deleteIfExists(absPath: string): boolean {
  if (!fs.existsSync(absPath)) return false;
  fs.rmSync(absPath, { recursive: true, force: true });
  return true;
}

export function stripFeatureDirectories(
  projectRoot: string,
  config: StripConfig,
): string[] {
  const deleted: string[] = [];

  for (const feature of config.features) {
    // Frontend directory: src/features/{feature}/
    const frontendDir = path.join(projectRoot, "src/features", feature);
    if (deleteIfExists(frontendDir)) deleted.push(`src/features/${feature}/`);

    // Backend directory: convex/{backendDirName}/
    const backendDirName = config.backendDirMap[feature] ?? feature;
    const backendDir = path.join(projectRoot, "convex", backendDirName);
    if (deleteIfExists(backendDir)) deleted.push(`convex/${backendDirName}/`);

    // Schema file: src/shared/schemas/{feature}.ts
    const schemaFile = path.join(
      projectRoot,
      "src/shared/schemas",
      `${feature}.ts`,
    );
    if (deleteIfExists(schemaFile))
      deleted.push(`src/shared/schemas/${feature}.ts`);

    // Route files
    const routeFiles = config.routeFileMap[feature] ?? [];
    for (const routeFile of routeFiles) {
      const routePath = path.join(
        projectRoot,
        "src/routes/_app/_auth/dashboard",
        routeFile,
      );
      if (deleteIfExists(routePath))
        deleted.push(
          `src/routes/_app/_auth/dashboard/${routeFile}`,
        );
    }

    // Locale files for all languages
    const localesDir = path.join(projectRoot, "public/locales");
    if (fs.existsSync(localesDir)) {
      const langs = fs
        .readdirSync(localesDir)
        .filter((entry) =>
          fs.statSync(path.join(localesDir, entry)).isDirectory(),
        );
      const i18nNamespace = config.i18nNamespaceMap[feature] ?? feature;
      for (const lang of langs) {
        const localePath = path.join(
          localesDir,
          lang,
          `${i18nNamespace}.json`,
        );
        if (deleteIfExists(localePath))
          deleted.push(`public/locales/${lang}/${i18nNamespace}.json`);
      }
    }

    // Feather YAML spec file
    const yamlPath = path.join(
      projectRoot,
      "src/features",
      feature,
      `${feature}.gen.yaml`,
    );
    // Already deleted with the frontend directory above, but in case it's elsewhere
    deleteIfExists(yamlPath);
  }

  return deleted;
}

// ─── Schema.ts surgical editing ─────────────────────────────────────────────

export function stripSchemaFile(
  schemaPath: string,
  config: StripConfig,
): void {
  if (!fs.existsSync(schemaPath)) return;

  const content = fs.readFileSync(schemaPath, "utf-8");
  const lines = content.split("\n");
  const result: string[] = [];

  // Collect schema file paths that should be removed from imports
  const strippedSchemaImports = new Set<string>();
  for (const feature of config.features) {
    strippedSchemaImports.add(`schemas/${feature}`);
  }

  // Collect table names to strip
  const strippedTables = new Set(
    config.features.map((f) => config.schemaTableMap[f] ?? f),
  );

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip import blocks that reference stripped schema files
    if (
      line.trim().startsWith("import") &&
      [...strippedSchemaImports].some((imp) => line.includes(imp))
    ) {
      // Skip until semicolon (handles both single-line and multi-line imports)
      while (i < lines.length && !lines[i].includes(";")) {
        i++;
      }
      i++; // skip the line with semicolon
      // Skip trailing blank line after import removal
      if (i < lines.length && lines[i].trim() === "") i++;
      continue;
    }

    // Skip "import { zodToConvex }" if no imports remain that use it
    // (we'll do a post-pass for unused imports)

    // Skip table definitions for stripped features
    // Match: `  tableName: defineTable({`
    const tableMatch = line.match(/^\s+(\w+):\s*defineTable\(/);
    if (tableMatch && strippedTables.has(tableMatch[1])) {
      // Skip the defineTable(...) block by tracking paren depth, then
      // continue skipping chained method calls like .index(...)
      i = skipDefinitionBlock(lines, i);
      // Skip trailing blank line after table removal
      if (i < lines.length && lines[i].trim() === "") i++;
      continue;
    }

    result.push(line);
    i++;
  }

  // Post-pass: remove zodToConvex import if it's no longer used
  const joined = result.join("\n");
  if (
    joined.includes("zodToConvex") &&
    !joined.replace(/import.*zodToConvex.*\n/, "").includes("zodToConvex")
  ) {
    // zodToConvex only appears in the import, not in use — remove it
    const finalLines = result.filter(
      (l) => !l.includes("zodToConvex"),
    );
    fs.writeFileSync(schemaPath, finalLines.join("\n"), "utf-8");
  } else {
    fs.writeFileSync(schemaPath, result.join("\n"), "utf-8");
  }
}

/**
 * Skip a defineTable({...}).index(...).index(...) block starting at line `start`.
 * Returns the line index after the entire chained expression.
 */
function skipDefinitionBlock(lines: string[], start: number): number {
  let i = start;
  let parenDepth = 0;
  let foundOpenParen = false;

  // Phase 1: skip the defineTable(...) part (track parentheses)
  while (i < lines.length) {
    const currentLine = lines[i];
    for (const ch of currentLine) {
      if (ch === "(") {
        parenDepth++;
        foundOpenParen = true;
      }
      if (ch === ")") parenDepth--;
    }
    i++;
    if (foundOpenParen && parenDepth === 0) break;
  }

  // Phase 2: skip chained .index(...) calls and trailing comma
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith(".index(") || trimmed.startsWith(".searchIndex(")) {
      // Skip the .index(...) line (may span multiple lines)
      parenDepth = 0;
      foundOpenParen = false;
      while (i < lines.length) {
        const currentLine = lines[i];
        for (const ch of currentLine) {
          if (ch === "(") {
            parenDepth++;
            foundOpenParen = true;
          }
          if (ch === ")") parenDepth--;
        }
        i++;
        if (foundOpenParen && parenDepth === 0) break;
      }
    } else {
      break;
    }
  }

  return i;
}

// ─── Nav.ts surgical editing ────────────────────────────────────────────────

export function stripNavFile(
  navPath: string,
  config: StripConfig,
): void {
  if (!fs.existsSync(navPath)) return;

  const content = fs.readFileSync(navPath, "utf-8");
  const lines = content.split("\n");
  const result: string[] = [];
  const pathsToStrip = new Set(config.navPathsToStrip);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Detect nav item objects by their `to:` property
    // Nav items start with `{` and contain `to: "..."` — look for the `to:` inside a block
    const toMatch = line.match(/to:\s*"([^"]+)"/);
    if (toMatch && pathsToStrip.has(toMatch[1])) {
      // We need to remove the entire nav item object: from the opening `{` to its closing `}`
      // Walk backwards to find the opening `{` (may be on the same line or a few lines back)
      // Remove lines from result that are part of this nav item
      while (result.length > 0) {
        const prevLine = result[result.length - 1];
        result.pop();
        if (prevLine.includes("{")) break;
      }
      // Walk forward past the closing `}`
      while (i < lines.length && !lines[i].includes("}")) {
        i++;
      }
      i++; // skip the closing `}` line
      // Skip trailing comma line if present
      if (i < lines.length && lines[i].trim() === "") i++;
      continue;
    }

    result.push(line);
    i++;
  }

  fs.writeFileSync(navPath, result.join("\n"), "utf-8");
}

// ─── Errors.ts surgical editing ─────────────────────────────────────────────

export function stripErrorsFile(
  errorsPath: string,
  config: StripConfig,
): void {
  if (!fs.existsSync(errorsPath)) return;

  const content = fs.readFileSync(errorsPath, "utf-8");
  const lines = content.split("\n");
  const result: string[] = [];
  const groupsToStrip = new Set(config.errorGroupsToStrip);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Match error group: `  groupName: {`
    const groupMatch = line.match(/^\s+(\w+):\s*\{/);
    if (groupMatch && groupsToStrip.has(groupMatch[1])) {
      // Skip entire group including nested content
      let braceDepth = 0;
      while (i < lines.length) {
        const currentLine = lines[i];
        for (const ch of currentLine) {
          if (ch === "{") braceDepth++;
          if (ch === "}") braceDepth--;
        }
        i++;
        if (braceDepth === 0) break;
      }
      // Skip trailing blank line
      if (i < lines.length && lines[i].trim() === "") i++;
      continue;
    }

    result.push(line);
    i++;
  }

  fs.writeFileSync(errorsPath, result.join("\n"), "utf-8");
}

// ─── i18n.ts namespace editing ──────────────────────────────────────────────

export function stripI18nFile(
  i18nPath: string,
  config: StripConfig,
): void {
  if (!fs.existsSync(i18nPath)) return;

  const content = fs.readFileSync(i18nPath, "utf-8");
  const namespacesToStrip = new Set(
    config.features.map((f) => config.i18nNamespaceMap[f] ?? f),
  );

  // The ns array is a single line like: const ns = ["common", "auth", ...];
  const updated = content.replace(
    /const ns = \[([^\]]+)\]/,
    (_match, inner: string) => {
      const namespaces = inner
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .filter((s) => {
          const unquoted = s.replace(/['"]/g, "");
          return !namespacesToStrip.has(unquoted);
        });
      return `const ns = [${namespaces.join(", ")}]`;
    },
  );

  fs.writeFileSync(i18nPath, updated, "utf-8");
}

// ─── Main orchestrator ──────────────────────────────────────────────────────

export async function stripToBase(
  projectRoot: string,
  config?: StripConfig,
): Promise<StripResult> {
  const cfg = config ?? defaultStripConfig;
  const errors: string[] = [];
  const modified: string[] = [];

  // 1. Delete feature directories and files
  let deleted: string[];
  try {
    deleted = stripFeatureDirectories(projectRoot, cfg);
  } catch (err) {
    errors.push(`Directory deletion failed: ${err}`);
    deleted = [];
  }

  // 2. Edit schema.ts
  try {
    const schemaPath = path.join(projectRoot, cfg.wiringFiles.schema);
    stripSchemaFile(schemaPath, cfg);
    modified.push(cfg.wiringFiles.schema);
  } catch (err) {
    errors.push(`Schema editing failed: ${err}`);
  }

  // 3. Edit nav.ts
  try {
    const navPath = path.join(projectRoot, cfg.wiringFiles.nav);
    stripNavFile(navPath, cfg);
    modified.push(cfg.wiringFiles.nav);
  } catch (err) {
    errors.push(`Nav editing failed: ${err}`);
  }

  // 4. Edit errors.ts
  try {
    const errorsPath = path.join(projectRoot, cfg.wiringFiles.errors);
    stripErrorsFile(errorsPath, cfg);
    modified.push(cfg.wiringFiles.errors);
  } catch (err) {
    errors.push(`Errors editing failed: ${err}`);
  }

  // 5. Edit i18n.ts
  try {
    const i18nPath = path.join(projectRoot, cfg.wiringFiles.i18n);
    stripI18nFile(i18nPath, cfg);
    modified.push(cfg.wiringFiles.i18n);
  } catch (err) {
    errors.push(`i18n editing failed: ${err}`);
  }

  return { deleted, modified, errors };
}

// ─── CLI entry point ────────────────────────────────────────────────────────

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("strip-to-base.ts");

if (isMainModule) {
  stripToBase(process.cwd())
    .then((result) => {
      console.log(`Stripped ${result.deleted.length} files/directories`);
      console.log(`Modified ${result.modified.length} wiring files`);
      if (result.errors.length > 0) {
        console.error("Errors:", result.errors);
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("Strip failed:", err);
      process.exit(1);
    });
}
