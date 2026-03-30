import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { generateFeature } from "../../templates/pipeline/generate";

// ── Find feature YAMLs ──────────────────────────────────────────────────────

function findFeatureYamls(projectRoot: string): string[] {
  const yamls: string[] = [];
  const srcFeatures = path.join(projectRoot, "src", "features");
  const srcGenerated = path.join(projectRoot, "src", "generated");

  for (const dir of [srcFeatures, srcGenerated]) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const yamlPath = path.join(dir, entry.name, "feather.yaml");
      if (fs.existsSync(yamlPath)) {
        yamls.push(yamlPath);
      }
    }
  }

  return yamls;
}

// ── Check for uncommitted changes ────────────────────────────────────────────

function hasUncommittedChanges(
  projectRoot: string,
  featureName: string,
): boolean {
  try {
    const result = execSync(
      `git status --porcelain src/generated/${featureName}/ convex/generated/${featureName}/ 2>/dev/null`,
      { cwd: projectRoot, encoding: "utf-8" },
    );
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

// ── Update action ────────────────────────────────────────────────────────────

export interface UpdateActionOptions {
  dryRun?: boolean;
  force?: boolean;
}

export async function updateAction(
  options: UpdateActionOptions,
  projectRoot: string,
): Promise<{ success: boolean; message: string }> {
  const yamls = findFeatureYamls(projectRoot);

  if (yamls.length === 0) {
    return {
      success: true,
      message: "No feature YAML files found. Nothing to update.",
    };
  }

  const lines: string[] = ["Updating generated code...\n"];
  lines.push(`Found ${yamls.length} feature(s):\n`);

  let totalFiles = 0;
  let errorCount = 0;

  for (const yamlPath of yamls) {
    const featureName = path.basename(path.dirname(yamlPath));

    // Check for uncommitted changes
    if (
      !options.force &&
      !options.dryRun &&
      hasUncommittedChanges(projectRoot, featureName)
    ) {
      lines.push(
        `  ${featureName}: SKIPPED (uncommitted changes — use --force to overwrite)`,
      );
      continue;
    }

    // Delete existing generated/ directory (skip in dry run)
    if (!options.dryRun) {
      const generatedFrontend = path.join(
        projectRoot,
        "src",
        "generated",
        featureName,
      );
      const generatedBackend = path.join(
        projectRoot,
        "convex",
        "generated",
        featureName,
      );
      if (fs.existsSync(generatedFrontend)) {
        fs.rmSync(generatedFrontend, { recursive: true });
      }
      if (fs.existsSync(generatedBackend)) {
        fs.rmSync(generatedBackend, { recursive: true });
      }
    }

    const result = await generateFeature({
      yamlPath,
      projectRoot,
      outputMode: "generated",
      dryRun: options.dryRun,
    });

    if (result.success) {
      lines.push(
        `  ${featureName}: ${result.scaffolded.files.length} files ${options.dryRun ? "would be " : ""}regenerated`,
      );
      totalFiles += result.scaffolded.files.length;
    } else {
      lines.push(
        `  ${featureName}: ERROR — ${result.errors.join("; ")}`,
      );
      errorCount++;
    }
  }

  lines.push(
    `\nUpdate ${options.dryRun ? "preview" : "complete"}. ${totalFiles} files across ${yamls.length - errorCount} features.`,
  );

  return {
    success: errorCount === 0,
    message: lines.join("\n"),
  };
}

// ── CLI command ──────────────────────────────────────────────────────────────

export const updateCommand = new Command("update")
  .description("Regenerate all generated/ files from current YAML configs")
  .option("--dry-run", "Preview changes without writing")
  .option("--force", "Overwrite even with uncommitted changes")
  .action(async (options: UpdateActionOptions) => {
    const result = await updateAction(options, process.cwd());
    console.log(result.message);
    if (!result.success) process.exit(1);
  });
