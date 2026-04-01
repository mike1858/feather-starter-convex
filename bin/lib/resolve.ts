/**
 * Bundle/feature auto-detection resolution.
 *
 * Checks bundles/ first (per D-03), then features/.
 * Returns a typed Resolution discriminated union.
 */
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";

export const bundleManifestSchema = z.object({
  name: z.string(),
  label: z.string(),
  description: z.string(),
  complexity: z.enum(["simple", "intermediate", "advanced"]),
  features: z.array(z.string()).min(1),
});
export type BundleManifest = z.infer<typeof bundleManifestSchema>;

export type Resolution =
  | { type: "bundle"; path: string; manifest: BundleManifest }
  | { type: "feature"; path: string; manifest: Record<string, unknown> }
  | { type: "not-found"; name: string };

/**
 * Resolve a name to either a bundle or a feature.
 * Bundles are checked first — if the same name exists as both bundle and feature, bundle wins.
 */
export function resolve(name: string, projectRoot: string): Resolution {
  // Check bundles/ first (per D-03)
  const bundlePath = path.join(
    projectRoot,
    "templates/bundles",
    name,
    "bundle.json",
  );
  if (fs.existsSync(bundlePath)) {
    const raw = JSON.parse(fs.readFileSync(bundlePath, "utf-8"));
    const manifest = bundleManifestSchema.parse(raw);
    return { type: "bundle", path: bundlePath, manifest };
  }

  // Then features/
  const featurePath = path.join(
    projectRoot,
    "templates/features",
    name,
    "manifest.json",
  );
  if (fs.existsSync(featurePath)) {
    const manifest = JSON.parse(
      fs.readFileSync(featurePath, "utf-8"),
    ) as Record<string, unknown>;
    return { type: "feature", path: featurePath, manifest };
  }

  return { type: "not-found", name };
}
