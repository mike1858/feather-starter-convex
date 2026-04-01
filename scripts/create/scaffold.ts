/**
 * Scaffold selected example apps into a project.
 *
 * Reads manifest.json from each bundled example under templates/features/{name}/,
 * copies files to the correct project locations, and wires into schema, nav, i18n, errors.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../..");

export interface ScaffoldOptions {
  projectRoot: string;
  exampleApps: string[];
  /** Override templates location (for testing). Defaults to templates/features/ in this repo. */
  templatesDir?: string;
}

export interface ScaffoldResult {
  installed: string[];
  skipped: string[];
  errors: string[];
}

export interface ExampleManifest {
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

/**
 * Install a single example app by copying bundled files and wiring.
 */
function installExample(
  projectRoot: string,
  exampleDir: string,
  manifest: ExampleManifest,
): string[] {
  const created: string[] = [];

  // Copy frontend files
  const frontendSrc = path.join(exampleDir, "frontend");
  const frontendDest = path.join(projectRoot, manifest.files.frontend);
  if (fs.existsSync(frontendSrc)) {
    copyDirRecursive(frontendSrc, frontendDest);
    created.push(manifest.files.frontend);
  }

  // Copy backend files
  const backendSrc = path.join(exampleDir, "backend");
  const backendDest = path.join(projectRoot, manifest.files.backend);
  if (fs.existsSync(backendSrc)) {
    copyDirRecursive(backendSrc, backendDest);
    created.push(manifest.files.backend);
  }

  // Copy schema file
  const schemaSrc = path.join(exampleDir, "schema");
  if (fs.existsSync(schemaSrc)) {
    const files = fs.readdirSync(schemaSrc);
    for (const file of files) {
      const destPath = path.join(
        projectRoot,
        "src/shared/schemas",
        file,
      );
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(path.join(schemaSrc, file), destPath);
      created.push(`src/shared/schemas/${file}`);
    }
  }

  // Copy route file
  const routeSrc = path.join(exampleDir, "route");
  if (fs.existsSync(routeSrc)) {
    const files = fs.readdirSync(routeSrc);
    for (const file of files) {
      const destPath = path.join(
        projectRoot,
        "src/routes/_app/_auth/dashboard",
        file,
      );
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(path.join(routeSrc, file), destPath);
      created.push(`src/routes/_app/_auth/dashboard/${file}`);
    }
  }

  // Copy locale files
  const localesSrc = path.join(exampleDir, "locales");
  if (fs.existsSync(localesSrc)) {
    for (const lang of fs.readdirSync(localesSrc)) {
      const langDir = path.join(localesSrc, lang);
      if (fs.statSync(langDir).isDirectory()) {
        for (const file of fs.readdirSync(langDir)) {
          const destPath = path.join(
            projectRoot,
            "public/locales",
            lang,
            file,
          );
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.copyFileSync(path.join(langDir, file), destPath);
          created.push(`public/locales/${lang}/${file}`);
        }
      }
    }
  }

  // Copy feather.yaml if present
  const yamlSrc = path.join(exampleDir, "feather.yaml");
  if (fs.existsSync(yamlSrc)) {
    const yamlDest = path.join(
      projectRoot,
      manifest.files.frontend,
      "feather.yaml",
    );
    fs.copyFileSync(yamlSrc, yamlDest);
    created.push(`${manifest.files.frontend}/feather.yaml`);
  }

  return created;
}

/**
 * Scaffold selected example apps into the project.
 *
 * For each app:
 * 1. Read manifest.json from templates/features/{name}/
 * 2. Copy all bundled files to the correct project locations
 * 3. Wire into project (schema, nav, i18n — handled by caller or post-step)
 */
export async function scaffoldExamples(
  options: ScaffoldOptions,
): Promise<ScaffoldResult> {
  const templatesDir =
    options.templatesDir ??
    path.join(PROJECT_ROOT, "templates/features");

  const installed: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const appName of options.exampleApps) {
    const exampleDir = path.join(templatesDir, appName);
    const manifestPath = path.join(exampleDir, "manifest.json");

    if (!fs.existsSync(manifestPath)) {
      errors.push(
        `Example '${appName}' not found at ${exampleDir}`,
      );
      continue;
    }

    try {
      const manifest: ExampleManifest = JSON.parse(
        fs.readFileSync(manifestPath, "utf-8"),
      );

      // Check if already installed
      const frontendDir = path.join(
        options.projectRoot,
        manifest.files.frontend,
      );
      if (fs.existsSync(frontendDir)) {
        skipped.push(appName);
        continue;
      }

      installExample(options.projectRoot, exampleDir, manifest);
      installed.push(appName);
    } catch (err) {
      errors.push(
        `Failed to install '${appName}': ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { installed, skipped, errors };
}

/**
 * Read a manifest.json for an example app.
 */
export function readManifest(
  exampleName: string,
  templatesDir?: string,
): ExampleManifest | null {
  const dir =
    templatesDir ?? path.join(PROJECT_ROOT, "templates/features");
  const manifestPath = path.join(dir, exampleName, "manifest.json");

  if (!fs.existsSync(manifestPath)) return null;

  return JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as ExampleManifest;
}
