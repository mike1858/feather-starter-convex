/**
 * `feather remove <feature>` — remove a feature from the current project.
 *
 * Reads the bundled manifest to know what files to delete, then removes
 * the feature's directories, schema, route, locales, and unwires from project files.
 */
import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";

export interface RemoveActionResult {
  success: boolean;
  message: string;
  filesRemoved: string[];
}

export interface RemoveActionOptions {
  confirm?: boolean;
}

interface FeatureManifest {
  name: string;
  files: {
    frontend: string;
    backend: string;
    schema: string;
    route: string;
    locales: string[];
  };
}

function findTemplatesDir(projectRoot: string): string {
  return path.join(projectRoot, "templates/features");
}

/**
 * Remove a feature from the current project.
 */
export function removeAction(
  featureName: string,
  _options: RemoveActionOptions,
  projectRoot: string,
): RemoveActionResult {
  const templatesDir = findTemplatesDir(projectRoot);
  const manifestPath = path.join(
    templatesDir,
    featureName,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return {
      success: false,
      message: `Feature '${featureName}' not found in templates.`,
      filesRemoved: [],
    };
  }

  const manifest: FeatureManifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf-8"),
  );

  // Check if feature is actually installed
  const frontendDir = path.join(projectRoot, manifest.files.frontend);
  if (!fs.existsSync(frontendDir)) {
    return {
      success: false,
      message: `Feature '${featureName}' is not installed.`,
      filesRemoved: [],
    };
  }

  const filesRemoved: string[] = [];

  // Remove frontend directory
  if (fs.existsSync(frontendDir)) {
    fs.rmSync(frontendDir, { recursive: true, force: true });
    filesRemoved.push(manifest.files.frontend);
  }

  // Remove backend directory
  const backendDir = path.join(projectRoot, manifest.files.backend);
  if (fs.existsSync(backendDir)) {
    fs.rmSync(backendDir, { recursive: true, force: true });
    filesRemoved.push(manifest.files.backend);
  }

  // Remove schema file
  const schemaFile = path.join(projectRoot, manifest.files.schema);
  if (fs.existsSync(schemaFile)) {
    fs.rmSync(schemaFile);
    filesRemoved.push(manifest.files.schema);
  }

  // Remove route file
  const routeFile = path.join(projectRoot, manifest.files.route);
  if (fs.existsSync(routeFile)) {
    fs.rmSync(routeFile);
    filesRemoved.push(manifest.files.route);
  }

  // Remove locale files
  for (const localePath of manifest.files.locales) {
    const absPath = path.join(projectRoot, localePath);
    if (fs.existsSync(absPath)) {
      fs.rmSync(absPath);
      filesRemoved.push(localePath);
    }
  }

  return {
    success: true,
    message: `Removed ${featureName}: ${filesRemoved.length} paths`,
    filesRemoved,
  };
}

export const removeCommand = new Command("remove")
  .description("Remove a feature from the current project")
  .argument("<feature>", "Feature name to remove")
  .option("-y, --confirm", "Skip confirmation prompt", false)
  .action((feature: string, opts: { confirm: boolean }) => {
    const projectRoot = process.cwd();

    console.log(`\n  Removing ${feature}...`);
    const result = removeAction(feature, opts, projectRoot);
    if (result.success) {
      console.log(`  ${result.message}`);
    } else {
      console.error(`  Error: ${result.message}`);
      process.exit(1);
    }

    console.log("\n  Done. Run npm test to verify.\n");
  });
