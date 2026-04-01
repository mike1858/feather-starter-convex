/**
 * `feather add <name>` — install a feature or bundle into the current project.
 *
 * Auto-detects whether the name is a bundle (templates/bundles/) or feature
 * (templates/features/). Bundles install all features in dependency order.
 */
import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import { resolve } from "../lib/resolve";
import {
  buildDependencyGraph,
  topoSort,
  validateDependencies,
} from "../lib/topo-sort";

export interface AddActionResult {
  success: boolean;
  message: string;
  filesCreated: string[];
}

export interface AddActionOptions {
  force?: boolean;
}

interface FeatureManifest {
  name: string;
  label: string;
  description: string;
  complexity: string;
  files: {
    frontend: string;
    backend: string;
    schema: string;
    route: string;
    locales: string[];
  };
  wiring: {
    schemaTable: string;
    navEntry: {
      label: string;
      i18nKey: string;
      to: string;
    };
    i18nNamespace: string;
  };
}

function copyDirRecursive(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function findTemplatesDir(projectRoot: string): string {
  return path.join(projectRoot, "templates/features");
}

/**
 * Install a single feature from templates/features/{name}/.
 * Extracted from addAction for reuse by bundle install path.
 */
function installSingleFeature(
  featureName: string,
  options: AddActionOptions,
  projectRoot: string,
): AddActionResult {
  const templatesDir = findTemplatesDir(projectRoot);
  const exampleDir = path.join(templatesDir, featureName);
  const manifestPath = path.join(exampleDir, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    return {
      success: false,
      message: `Feature '${featureName}' not found. Available: ${getAvailableFeatures(templatesDir).join(", ")}`,
      filesCreated: [],
    };
  }

  const manifest: FeatureManifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf-8"),
  );

  // Check if feature already exists
  const frontendDir = path.join(projectRoot, manifest.files.frontend);
  if (fs.existsSync(frontendDir) && !options.force) {
    return {
      success: false,
      message: `Feature '${featureName}' already exists. Use --force to overwrite.`,
      filesCreated: [],
    };
  }

  const filesCreated: string[] = [];

  // Copy frontend
  const frontendSrc = path.join(exampleDir, "frontend");
  if (fs.existsSync(frontendSrc)) {
    copyDirRecursive(frontendSrc, frontendDir);
    filesCreated.push(manifest.files.frontend);
  }

  // Copy backend
  const backendSrc = path.join(exampleDir, "backend");
  const backendDest = path.join(projectRoot, manifest.files.backend);
  if (fs.existsSync(backendSrc)) {
    copyDirRecursive(backendSrc, backendDest);
    filesCreated.push(manifest.files.backend);
  }

  // Copy schema
  const schemaSrc = path.join(exampleDir, "schema");
  if (fs.existsSync(schemaSrc)) {
    for (const file of fs.readdirSync(schemaSrc)) {
      const dest = path.join(projectRoot, "src/shared/schemas", file);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(schemaSrc, file), dest);
      filesCreated.push(`src/shared/schemas/${file}`);
    }
  }

  // Copy route
  const routeSrc = path.join(exampleDir, "route");
  if (fs.existsSync(routeSrc)) {
    for (const file of fs.readdirSync(routeSrc)) {
      const dest = path.join(
        projectRoot,
        "src/routes/_app/_auth/dashboard",
        file,
      );
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(routeSrc, file), dest);
      filesCreated.push(`src/routes/_app/_auth/dashboard/${file}`);
    }
  }

  // Copy locales
  const localesSrc = path.join(exampleDir, "locales");
  if (fs.existsSync(localesSrc)) {
    for (const lang of fs.readdirSync(localesSrc)) {
      const langDir = path.join(localesSrc, lang);
      if (fs.statSync(langDir).isDirectory()) {
        for (const file of fs.readdirSync(langDir)) {
          const dest = path.join(
            projectRoot,
            "public/locales",
            lang,
            file,
          );
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(path.join(langDir, file), dest);
          filesCreated.push(`public/locales/${lang}/${file}`);
        }
      }
    }
  }

  return {
    success: true,
    message: `Installed ${featureName}: ${filesCreated.length} paths`,
    filesCreated,
  };
}

/** Get list of installed features by checking src/features/ and src/generated/ */
function getInstalledFeatures(projectRoot: string): string[] {
  const installed: string[] = [];
  for (const dir of ["src/features", "src/generated"]) {
    const absDir = path.join(projectRoot, dir);
    if (!fs.existsSync(absDir)) continue;
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !installed.includes(entry.name)) {
        installed.push(entry.name);
      }
    }
  }
  return installed;
}

/**
 * Install a feature or bundle into the current project.
 * Auto-detects bundles (checks bundles/ first, then features/ per D-03).
 */
export function addAction(
  name: string,
  options: AddActionOptions,
  projectRoot: string,
): AddActionResult {
  const resolution = resolve(name, projectRoot);

  if (resolution.type === "not-found") {
    const templatesDir = findTemplatesDir(projectRoot);
    const features = getAvailableFeatures(templatesDir);
    const bundles = getAvailableBundles(projectRoot);
    const available = [...features, ...bundles.map((b) => `${b} (bundle)`)];
    return {
      success: false,
      message: `Feature '${name}' not found. Available: ${available.join(", ")}`,
      filesCreated: [],
    };
  }

  if (resolution.type === "feature") {
    return installSingleFeature(name, options, projectRoot);
  }

  // Bundle installation
  const { manifest } = resolution;
  const featuresDir = path.join(projectRoot, "templates/features");

  // Build dependency graph and validate
  const graph = buildDependencyGraph(manifest.features, featuresDir);
  const installed = getInstalledFeatures(projectRoot);
  const validation = validateDependencies(graph, installed);

  if (!validation.valid) {
    const errors = validation.missing
      .map(
        (m) =>
          `Feature '${m.feature}' requires '${m.dependency}', which is not installed and not in this bundle.`,
      )
      .join(" ");
    return {
      success: false,
      message: errors,
      filesCreated: [],
    };
  }

  // Sort features in dependency order
  const sortedFeatures = topoSort(graph);

  // Install each feature in order, force=true for already-installed (per D-10)
  const allFilesCreated: string[] = [];
  for (const feature of sortedFeatures) {
    const result = installSingleFeature(
      feature,
      { force: true },
      projectRoot,
    );
    if (!result.success) {
      return {
        success: false,
        message: `Failed to install '${feature}' from bundle '${name}': ${result.message}`,
        filesCreated: allFilesCreated,
      };
    }
    allFilesCreated.push(...result.filesCreated);
  }

  return {
    success: true,
    message: `Installed bundle '${name}' (${sortedFeatures.length} features): ${allFilesCreated.length} paths`,
    filesCreated: allFilesCreated,
  };
}

function getAvailableFeatures(templatesDir: string): string[] {
  if (!fs.existsSync(templatesDir)) return [];
  return fs
    .readdirSync(templatesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .filter((e) =>
      fs.existsSync(path.join(templatesDir, e.name, "manifest.json")),
    )
    .map((e) => e.name);
}

function getAvailableBundles(projectRoot: string): string[] {
  const bundlesDir = path.join(projectRoot, "templates/bundles");
  if (!fs.existsSync(bundlesDir)) return [];
  return fs
    .readdirSync(bundlesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .filter((e) =>
      fs.existsSync(path.join(bundlesDir, e.name, "bundle.json")),
    )
    .map((e) => e.name);
}

export const addCommand = new Command("add")
  .description("Install a feature or bundle into the current project")
  .argument("<name...>", "Feature or bundle name(s) to install")
  .option("-f, --force", "Overwrite existing files", false)
  .action((names: string[], opts: { force: boolean }) => {
    const projectRoot = process.cwd();

    for (const name of names) {
      console.log(`\n  Installing ${name}...`);
      const result = addAction(name, opts, projectRoot);
      if (result.success) {
        console.log(`  ${result.message}`);
      } else {
        console.error(`  Error: ${result.message}`);
        process.exit(1);
      }
    }

    console.log("\n  Done. Run npm test to verify.\n");
  });
