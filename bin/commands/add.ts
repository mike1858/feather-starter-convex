/**
 * `feather add <feature>` — install an example feature into the current project.
 *
 * Reads the bundled manifest from templates/features/{name}/, copies files
 * to the correct project locations, and wires into schema, nav, i18n, errors.
 */
import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";

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
 * Install a feature into the current project.
 */
export function addAction(
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

export const addCommand = new Command("add")
  .description("Install a feature into the current project")
  .argument("<feature...>", "Feature name(s) to install")
  .option("-f, --force", "Overwrite existing files", false)
  .action((features: string[], opts: { force: boolean }) => {
    const projectRoot = process.cwd();

    for (const feature of features) {
      console.log(`\n  Installing ${feature}...`);
      const result = addAction(feature, opts, projectRoot);
      if (result.success) {
        console.log(`  ${result.message}`);
      } else {
        console.error(`  Error: ${result.message}`);
        process.exit(1);
      }
    }

    console.log("\n  Done. Run npm test to verify.\n");
  });
