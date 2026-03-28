import * as readline from "node:readline";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

function ask(
  rl: readline.Interface,
  question: string,
  defaultValue?: string,
): Promise<string> {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue || "");
    });
    rl.once("close", () => resolve(defaultValue || ""));
  });
}

function toKebab(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toTitleCase(kebab: string): string {
  return kebab
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function replaceInFile(
  filePath: string,
  replacements: [string, string][],
): boolean {
  const abs = path.resolve(ROOT, filePath);
  if (!fs.existsSync(abs)) return false;
  let content = fs.readFileSync(abs, "utf-8");
  let changed = false;
  for (const [search, replace] of replacements) {
    if (content.includes(search)) {
      content = content.replaceAll(search, replace);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(abs, content, "utf-8");
  return changed;
}

function isAlreadySetup(): boolean {
  const siteConfig = fs.readFileSync(
    path.resolve(ROOT, "site.config.ts"),
    "utf-8",
  );
  return !siteConfig.includes("Feather Starter");
}

function replaceBranding(appName: string, appDescription: string): number {
  const kebab = toKebab(appName);
  let count = 0;

  const files: { path: string; replacements: [string, string][] }[] = [
    {
      path: "package.json",
      replacements: [['"feather-starter-convex"', `"${kebab}"`]],
    },
    {
      path: "site.config.ts",
      replacements: [
        ['"Feather Starter"', `"${appName}"`],
        [
          '"A lightweight, production-ready starter template powered by Convex and React."',
          `"${appDescription}"`,
        ],
      ],
    },
    {
      path: "convex/config.ts",
      replacements: [['"Feather Starter"', `"${appName}"`]],
    },
    {
      path: "site.config.test.ts",
      replacements: [['toBe("Feather Starter")', `toBe("${appName}")`]],
    },
  ];

  for (const file of files) {
    if (replaceInFile(file.path, file.replacements)) count++;
  }

  return count;
}

async function main() {
  console.log("");
  console.log("Feather Starter — Project Setup");
  console.log("───────────────────────────────────");
  console.log("");

  if (isAlreadySetup()) {
    console.log("Project already configured (branding has been updated).");
    console.log("  To reconfigure, restore the original files and re-run.");
    process.exit(0);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const folderName = path.basename(ROOT);
    const defaultName = toTitleCase(folderName);
    const defaultDescription =
      "A lightweight, production-ready starter template powered by Convex and React.";

    const appName = await ask(rl, "App display name", defaultName);
    const appDescription = await ask(
      rl,
      "App description",
      defaultDescription,
    );

    rl.close();

    console.log("\nUpdating branding...");
    const filesUpdated = replaceBranding(appName, appDescription);
    console.log(`  Updated ${filesUpdated} files`);

    console.log("\nInitializing Convex...");
    try {
      execSync("npx convex dev --once", { cwd: ROOT, stdio: "inherit" });
    } catch {
      console.log(
        "  Convex init completed (errors above may be expected on first run).",
      );
    }

    // Restore convex/tsconfig.json (Convex CLI overwrites it)
    try {
      execSync("git restore convex/tsconfig.json", { cwd: ROOT });
      console.log("  Restored convex/tsconfig.json (path aliases)");
    } catch {
      // Not a git repo or file not changed — fine
    }

    const kebab = toKebab(appName);
    console.log("");
    console.log("────────────────────────────────────────");
    console.log("");
    console.log("Setup complete!");
    console.log("");
    console.log(`  App name: ${appName}`);
    console.log(`  Package name: ${kebab}`);
    console.log(`  Branding: updated in ${filesUpdated} files`);
    console.log("");
    console.log("Next: npm start");
    console.log("");
  } catch (err) {
    rl.close();
    console.error("\nSetup failed:", err);
    process.exit(1);
  }
}

main();
