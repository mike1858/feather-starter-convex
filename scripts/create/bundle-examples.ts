#!/usr/bin/env npx tsx
/**
 * Bundle feature app files from the main project into templates/features/{name}/.
 *
 * This script copies actual feature files into a self-contained bundle format
 * that feather add/remove can install. Run after updating example features.
 *
 * Usage: npx tsx scripts/create/bundle-examples.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

interface ExampleConfig {
  name: string;
  label: string;
  description: string;
  complexity: string;
  /** Backend directory name (may differ from feature name, e.g. camelCase). */
  backendDir: string;
  /** Route file name(s). */
  routeFiles: string[];
  /** i18n namespace (usually matches feature name). */
  i18nNamespace: string;
  /** Nav path. */
  navPath: string;
}

const FEATURES: ExampleConfig[] = [
  {
    name: "todos",
    label: "Todos",
    description: "Simple CRUD example — todo list with completion tracking",
    complexity: "simple",
    backendDir: "todos",
    routeFiles: ["_layout.todos.tsx"],
    i18nNamespace: "todos",
    navPath: "/dashboard/todos",
  },
  {
    name: "tickets",
    label: "Tickets",
    description:
      "Status transitions and priority — support ticket tracker",
    complexity: "intermediate",
    backendDir: "tickets",
    routeFiles: ["_layout.tickets.tsx"],
    i18nNamespace: "tickets",
    navPath: "/dashboard/tickets",
  },
  {
    name: "contacts",
    label: "Contacts",
    description: "Multi-field entity — contact management with search",
    complexity: "intermediate",
    backendDir: "contacts",
    routeFiles: ["_layout.contacts.tsx"],
    i18nNamespace: "contacts",
    navPath: "/dashboard/contacts",
  },
];

function copyDirContents(src: string, dest: string, skipTests = true): number {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip test files — they reference relative imports that won't exist in bundles
    if (skipTests && entry.isFile() && /\.test\.(ts|tsx)$/.test(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      count += copyDirContents(srcPath, destPath, skipTests);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }
  return count;
}

function bundleExample(config: ExampleConfig): number {
  const destDir = path.join(ROOT, "templates/features", config.name);

  // Clean and recreate
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  let fileCount = 0;

  // Frontend files
  const frontendSrc = path.join(ROOT, "src/features", config.name);
  if (fs.existsSync(frontendSrc)) {
    fileCount += copyDirContents(frontendSrc, path.join(destDir, "frontend"));
  }

  // Backend files
  const backendSrc = path.join(ROOT, "convex", config.backendDir);
  if (fs.existsSync(backendSrc)) {
    fileCount += copyDirContents(backendSrc, path.join(destDir, "backend"));
  }

  // Schema file
  const schemaSrc = path.join(ROOT, "src/shared/schemas", `${config.name}.ts`);
  if (fs.existsSync(schemaSrc)) {
    fs.mkdirSync(path.join(destDir, "schema"), { recursive: true });
    fs.copyFileSync(schemaSrc, path.join(destDir, "schema", `${config.name}.ts`));
    fileCount++;
  }

  // Route files
  for (const routeFile of config.routeFiles) {
    const routeSrc = path.join(
      ROOT,
      "src/routes/_app/_auth/dashboard",
      routeFile,
    );
    if (fs.existsSync(routeSrc)) {
      fs.mkdirSync(path.join(destDir, "route"), { recursive: true });
      fs.copyFileSync(routeSrc, path.join(destDir, "route", routeFile));
      fileCount++;
    }
  }

  // Locale files
  const localesDir = path.join(ROOT, "public/locales");
  if (fs.existsSync(localesDir)) {
    for (const lang of fs.readdirSync(localesDir)) {
      const localeSrc = path.join(
        localesDir,
        lang,
        `${config.i18nNamespace}.json`,
      );
      if (fs.existsSync(localeSrc)) {
        fs.mkdirSync(path.join(destDir, "locales", lang), { recursive: true });
        fs.copyFileSync(
          localeSrc,
          path.join(destDir, "locales", lang, `${config.i18nNamespace}.json`),
        );
        fileCount++;
      }
    }
  }

  // Create manifest.json
  const manifest = {
    name: config.name,
    label: config.label,
    description: config.description,
    complexity: config.complexity,
    files: {
      frontend: `src/features/${config.name}/`,
      backend: `convex/${config.backendDir}/`,
      schema: `src/shared/schemas/${config.name}.ts`,
      route: `src/routes/_app/_auth/dashboard/${config.routeFiles[0]}`,
      locales: [
        `public/locales/en/${config.i18nNamespace}.json`,
        `public/locales/es/${config.i18nNamespace}.json`,
      ],
    },
    wiring: {
      schemaTable: config.name,
      navEntry: {
        label: config.label,
        i18nKey: `${config.name}.nav.${config.name}`,
        to: config.navPath,
      },
      i18nNamespace: config.i18nNamespace,
    },
  };

  fs.writeFileSync(
    path.join(destDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  fileCount++;

  return fileCount;
}

// Main
let totalFiles = 0;
for (const feature of FEATURES) {
  const count = bundleExample(feature);
  console.log(`  Bundled ${feature.name}: ${count} files`);
  totalFiles += count;
}
console.log(`\n  Total: ${totalFiles} files in ${FEATURES.length} bundles`);
