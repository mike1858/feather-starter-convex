/**
 * `feather list` — show installed and available features and bundles.
 *
 * Scans the project to determine what's installed (src/features/, src/generated/)
 * and what's available (templates/features/, templates/bundles/).
 */
import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import { bundleManifestSchema } from "../lib/resolve";

export interface ListActionResult {
  installed: string[];
  availableFeatures: string[];
  availableBundles: {
    name: string;
    label: string;
    featureCount: number;
    installed: boolean;
  }[];
}

export function listAction(projectRoot: string): ListActionResult {
  const featuresDir = path.join(projectRoot, "templates/features");
  const bundlesDir = path.join(projectRoot, "templates/bundles");

  // Find installed features: check src/features/{name}/ or src/generated/{name}/
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

  // Find available features (in templates but not installed)
  const availableFeatures: string[] = [];
  if (fs.existsSync(featuresDir)) {
    for (const entry of fs.readdirSync(featuresDir, { withFileTypes: true })) {
      if (
        entry.isDirectory() &&
        fs.existsSync(path.join(featuresDir, entry.name, "manifest.json"))
      ) {
        if (!installed.includes(entry.name)) {
          availableFeatures.push(entry.name);
        }
      }
    }
  }

  // Find available bundles
  const availableBundles: ListActionResult["availableBundles"] = [];
  if (fs.existsSync(bundlesDir)) {
    for (const entry of fs.readdirSync(bundlesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const bundlePath = path.join(bundlesDir, entry.name, "bundle.json");
      if (!fs.existsSync(bundlePath)) continue;
      try {
        const raw = JSON.parse(fs.readFileSync(bundlePath, "utf-8"));
        const manifest = bundleManifestSchema.parse(raw);
        const allInstalled = manifest.features.every((f) =>
          installed.includes(f),
        );
        availableBundles.push({
          name: manifest.name,
          label: manifest.label,
          featureCount: manifest.features.length,
          installed: allInstalled,
        });
      } catch {
        /* skip invalid bundles */
      }
    }
  }

  return { installed, availableFeatures, availableBundles };
}

export const listCommand = new Command("list")
  .description("Show installed and available features and bundles")
  .action(() => {
    const result = listAction(process.cwd());

    if (result.installed.length > 0) {
      console.log("\n  Installed features:");
      console.log(`    ${result.installed.join(", ")}`);
    } else {
      console.log("\n  No features installed.");
    }

    if (result.availableFeatures.length > 0) {
      console.log("\n  Available features (not installed):");
      console.log(`    ${result.availableFeatures.join(", ")}`);
    }

    if (result.availableBundles.length > 0) {
      console.log("\n  Available bundles:");
      for (const b of result.availableBundles) {
        const status = b.installed ? " (installed)" : "";
        console.log(`    ${b.name} (${b.featureCount} features)${status}`);
      }
    }

    console.log("");
  });
