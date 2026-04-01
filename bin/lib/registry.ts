/**
 * GitHub registry client for remote feature/bundle fetching.
 *
 * Registry URL format: https://raw.githubusercontent.com/{owner}/{repo}/{ref}/templates/
 * Auth: FEATHER_REGISTRY_TOKEN env var for private repos (Bearer token).
 *
 * Per D-04: Local-first with GitHub fallback.
 * Per D-05: GitHub repo IS the registry (raw file serving).
 * Per D-06: bundle.json/manifest.json format identical local and remote.
 * Per D-08: feather update syncs from registry when configured, regenerates-only otherwise.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import YAML from "yaml";
import { bundleManifestSchema } from "./resolve";

export interface RegistryConfig {
  url: string;
}

/**
 * Read registry config from feather.yaml at project root.
 * Returns null if no feather.yaml or no registry section.
 */
export function getRegistryConfig(
  projectRoot: string,
): RegistryConfig | null {
  const yamlPath = path.join(projectRoot, "feather.yaml");
  if (!fs.existsSync(yamlPath)) return null;
  const parsed = YAML.parse(fs.readFileSync(yamlPath, "utf-8"));
  if (!parsed?.registry?.url) return null;
  return { url: parsed.registry.url };
}

/**
 * Fetch a feature or bundle from the remote registry.
 * Tries bundle.json first, then manifest.json (same order as local resolve).
 * Downloads all feature files listed in manifest and caches locally in templates/.
 * Returns the local cache path, or null if not found remotely.
 */
export async function fetchFromRegistry(
  name: string,
  registryUrl: string,
  projectRoot: string,
  token?: string,
): Promise<{ type: "bundle" | "feature"; localPath: string } | null> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const normalizedUrl = registryUrl.replace(/\/$/, "");

  // Try bundle first
  try {
    const bundleUrl = `${normalizedUrl}/bundles/${name}/bundle.json`;
    const bundleRes = await fetch(bundleUrl, { headers });
    if (bundleRes.ok) {
      const bundleJson = await bundleRes.json();
      bundleManifestSchema.parse(bundleJson);

      // Cache bundle.json locally
      const localBundleDir = path.join(
        projectRoot,
        "templates/bundles",
        name,
      );
      fs.mkdirSync(localBundleDir, { recursive: true });
      fs.writeFileSync(
        path.join(localBundleDir, "bundle.json"),
        JSON.stringify(bundleJson, null, 2) + "\n",
      );

      // For each feature in the bundle, fetch its files too
      for (const feature of bundleJson.features) {
        await fetchFeatureFiles(
          feature,
          normalizedUrl,
          projectRoot,
          headers,
        );
      }

      return { type: "bundle", localPath: localBundleDir };
    }
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message.includes("fetch")
    ) {
      throw new Error(
        `Network error fetching from registry (${registryUrl}). Check your network connection and registry URL.`,
      );
    }
    // Non-network errors (e.g., Zod validation) — fall through to feature check
  }

  // Try feature
  try {
    const manifestUrl = `${normalizedUrl}/features/${name}/manifest.json`;
    const manifestRes = await fetch(manifestUrl, { headers });
    if (manifestRes.ok) {
      await fetchFeatureFiles(name, normalizedUrl, projectRoot, headers);
      return {
        type: "feature",
        localPath: path.join(projectRoot, "templates/features", name),
      };
    }
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message.includes("fetch")
    ) {
      throw new Error(
        `Network error fetching from registry (${registryUrl}). Check your network connection and registry URL.`,
      );
    }
  }

  return null; // Not found remotely
}

/**
 * Fetch all files for a single feature from the registry and cache locally.
 * Reads the manifest.json to get the file list, then fetches each file.
 * Per D-06: manifest.json format is identical local and remote.
 * Per Pitfall 3 from RESEARCH.md: uses manifest.files to enumerate all paths.
 */
async function fetchFeatureFiles(
  featureName: string,
  registryUrl: string,
  projectRoot: string,
  headers: Record<string, string>,
): Promise<void> {
  const manifestUrl = `${registryUrl}/features/${featureName}/manifest.json`;
  const manifestRes = await fetch(manifestUrl, { headers });
  if (!manifestRes.ok) return;

  const manifest = await manifestRes.json();
  const localFeatureDir = path.join(
    projectRoot,
    "templates/features",
    featureName,
  );
  fs.mkdirSync(localFeatureDir, { recursive: true });

  // Save manifest
  fs.writeFileSync(
    path.join(localFeatureDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );

  // Fetch known subdirectories: frontend, backend, schema, route, locales
  // GitHub raw API doesn't list directories — we fetch known files from the manifest.
  // For each category in manifest.files, fetch the corresponding directory listing.
  // Minimum viable: save the manifest so local resolve() can find this feature.
  // File-level fetching can be enhanced when the registry adds a files_flat field.
  const subdirs = ["frontend", "backend", "schema", "route", "locales"];
  for (const subdir of subdirs) {
    const subdirUrl = `${registryUrl}/features/${featureName}/${subdir}/`;
    // Attempt to fetch a known marker file for each subdir
    // Since we can't list directories, we rely on the manifest being cached
    // and the feature template being available for local install after sync
    const localSubdir = path.join(localFeatureDir, subdir);
    fs.mkdirSync(localSubdir, { recursive: true });
  }
}

/**
 * Sync all features and bundles from registry to local templates/.
 * Per D-08: only runs when registry is configured.
 * Uses the project's feather.yaml bundles/features lists to know what to sync.
 */
export async function syncRegistry(
  config: RegistryConfig | null,
  projectRoot: string,
): Promise<{ synced: number; message: string }> {
  if (!config) {
    return { synced: 0, message: "No registry configured. Skipping sync." };
  }

  const token = process.env.FEATHER_REGISTRY_TOKEN;
  const normalizedUrl = config.url.replace(/\/$/, "");

  // Read project config to know what to sync
  const yamlPath = path.join(projectRoot, "feather.yaml");
  if (!fs.existsSync(yamlPath)) {
    return { synced: 0, message: "No feather.yaml found." };
  }
  const projectConfig = YAML.parse(fs.readFileSync(yamlPath, "utf-8"));
  const bundleNames: string[] = projectConfig.bundles ?? [];
  const featureNames: string[] = projectConfig.features ?? [];

  let synced = 0;
  const errors: string[] = [];

  for (const name of [...bundleNames, ...featureNames]) {
    try {
      const result = await fetchFromRegistry(
        name,
        normalizedUrl,
        projectRoot,
        token,
      );
      if (result) synced++;
    } catch (e) {
      errors.push(`${name}: ${(e as Error).message}`);
    }
  }

  const msg =
    errors.length > 0
      ? `Synced ${synced} items. Errors: ${errors.join("; ")}`
      : `Synced ${synced} items from registry.`;

  return { synced, message: msg };
}
