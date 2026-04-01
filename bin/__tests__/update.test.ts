import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execSync } from "node:child_process";
import { updateAction } from "../commands/update";

const PROJECT_ROOT = path.resolve(__dirname, "../..");

const MINIMAL_YAML = `name: widgets
label: Widget
fields:
  title:
    type: string
    required: true
`;

const CONTACTS_YAML = `name: contacts
label: Contact
fields:
  email:
    type: email
    required: true
`;

function setupTempProject(tempDir: string): void {
  const convexDir = path.join(tempDir, "convex");
  const srcSharedDir = path.join(tempDir, "src", "shared");
  const srcDir = path.join(tempDir, "src");
  const templatesDir = path.join(tempDir, "templates");

  fs.mkdirSync(convexDir, { recursive: true });
  fs.mkdirSync(srcSharedDir, { recursive: true });
  fs.mkdirSync(templatesDir, { recursive: true });

  fs.cpSync(
    path.join(PROJECT_ROOT, "templates", "defaults.yaml"),
    path.join(templatesDir, "defaults.yaml"),
  );

  fs.writeFileSync(
    path.join(convexDir, "schema.ts"),
    `import { defineSchema, defineTable } from "convex/server";\nimport { v } from "convex/values";\nconst schema = defineSchema({\n  users: defineTable({ name: v.optional(v.string()) }),\n});\nexport default schema;\n`,
  );
  fs.writeFileSync(
    path.join(convexDir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { target: "ESNext", module: "ESNext", moduleResolution: "bundler", strict: true, skipLibCheck: true },
      include: ["./**/*.ts"],
    }),
  );
  fs.writeFileSync(
    path.join(srcSharedDir, "nav.ts"),
    `export interface NavItem { label: string; i18nKey: string; to: string; }\nexport const navItems: NavItem[] = [\n  { label: "Dashboard", i18nKey: "d", to: "/dashboard" },\n  { label: "Settings", i18nKey: "s", to: "/dashboard/settings" },\n];\n`,
  );
  fs.writeFileSync(
    path.join(srcDir, "i18n.ts"),
    `const ns = ["common"];\nexport default ns;\n`,
  );
  fs.writeFileSync(
    path.join(srcSharedDir, "errors.ts"),
    `export const ERRORS = {\n  common: { UNKNOWN: "Unknown error." },\n} as const;\n`,
  );
}

function createFeatureYaml(tempDir: string, name: string, yaml: string): void {
  const featureDir = path.join(tempDir, "src", "features", name);
  fs.mkdirSync(featureDir, { recursive: true });
  fs.writeFileSync(path.join(featureDir, "feather.yaml"), yaml);
}

function initGitRepo(tempDir: string): void {
  execSync("git init", { cwd: tempDir, stdio: "ignore" });
  execSync("git add .", { cwd: tempDir, stdio: "ignore" });
  execSync('git commit -m "initial"', { cwd: tempDir, stdio: "ignore" });
}

function gitAddCommit(tempDir: string, message: string): void {
  execSync("git add .", { cwd: tempDir, stdio: "ignore" });
  execSync(`git commit -m "${message}" --allow-empty`, { cwd: tempDir, stdio: "ignore" });
}

describe("feather update", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "update-test-"));
    setupTempProject(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("reports no features found when none exist", async () => {
    const result = await updateAction({}, tempDir);
    expect(result.success).toBe(true);
    expect(result.message).toContain("No feature YAML");
  });

  it("regenerates generated files from YAML", async () => {
    createFeatureYaml(tempDir, "widgets", MINIMAL_YAML);
    initGitRepo(tempDir);

    // Generate initial files
    const firstResult = await updateAction({}, tempDir);
    expect(firstResult.success).toBe(true);

    // Commit generated files
    gitAddCommit(tempDir, "add generated files");

    // Modify a generated file
    const schemaFragment = path.join(tempDir, "src", "generated", "widgets", "index.ts");
    if (fs.existsSync(schemaFragment)) {
      fs.writeFileSync(schemaFragment, "// modified content");
      gitAddCommit(tempDir, "modify generated file");
    }

    // Run update again
    const result = await updateAction({}, tempDir);
    expect(result.success).toBe(true);
    expect(result.message).toContain("widgets");
    expect(result.message).toContain("regenerated");
  });

  it("skips features with uncommitted changes", async () => {
    createFeatureYaml(tempDir, "widgets", MINIMAL_YAML);
    initGitRepo(tempDir);

    // Generate initial files
    await updateAction({}, tempDir);
    gitAddCommit(tempDir, "add generated files");

    // Modify a generated file without committing
    const generatedDir = path.join(tempDir, "src", "generated", "widgets");
    if (fs.existsSync(generatedDir)) {
      const files = fs.readdirSync(generatedDir, { recursive: true, withFileTypes: true });
      const firstFile = files.find((f) => f.isFile());
      if (firstFile) {
        const filePath = path.join(generatedDir, firstFile.name);
        fs.writeFileSync(filePath, "// uncommitted modification");
      }
    }

    const result = await updateAction({}, tempDir);
    expect(result.message).toContain("SKIPPED");
    expect(result.message).toContain("uncommitted");
  });

  it("force overwrites uncommitted changes", async () => {
    createFeatureYaml(tempDir, "widgets", MINIMAL_YAML);
    initGitRepo(tempDir);

    // Generate initial files
    await updateAction({}, tempDir);
    gitAddCommit(tempDir, "add generated files");

    // Modify a generated file without committing
    const generatedDir = path.join(tempDir, "src", "generated", "widgets");
    if (fs.existsSync(generatedDir)) {
      const files = fs.readdirSync(generatedDir, { recursive: true, withFileTypes: true });
      const firstFile = files.find((f) => f.isFile());
      if (firstFile) {
        const filePath = path.join(generatedDir, firstFile.name);
        fs.writeFileSync(filePath, "// uncommitted modification");
      }
    }

    const result = await updateAction({ force: true }, tempDir);
    expect(result.success).toBe(true);
    expect(result.message).toContain("regenerated");
    expect(result.message).not.toContain("SKIPPED");
  });

  it("dry run shows preview without writing files", async () => {
    createFeatureYaml(tempDir, "widgets", MINIMAL_YAML);

    const result = await updateAction({ dryRun: true }, tempDir);
    expect(result.success).toBe(true);
    expect(result.message).toContain("preview");
    expect(result.message).toContain("would be");

    // Verify no generated files created on disk
    const generatedDir = path.join(tempDir, "src", "generated", "widgets");
    expect(fs.existsSync(generatedDir)).toBe(false);
  });

  it("handles missing YAML gracefully — reports 0 features", async () => {
    // Create a feature directory with no feather.yaml
    const badDir = path.join(tempDir, "src", "features", "bad");
    fs.mkdirSync(badDir, { recursive: true });

    const result = await updateAction({}, tempDir);
    expect(result.success).toBe(true);
    expect(result.message).toContain("No feature YAML");
  });

  it("preserves custom code in features/ directory", async () => {
    createFeatureYaml(tempDir, "widgets", MINIMAL_YAML);
    initGitRepo(tempDir);

    // Generate initial files
    await updateAction({}, tempDir);

    // Add a custom file to the features/ directory
    const customFile = path.join(tempDir, "src", "features", "widgets", "custom.ts");
    fs.writeFileSync(customFile, 'export const CUSTOM = "untouched";');
    gitAddCommit(tempDir, "add custom and generated files");

    // Run update
    const result = await updateAction({}, tempDir);
    expect(result.success).toBe(true);

    // Verify custom file survived
    expect(fs.existsSync(customFile)).toBe(true);
    const content = fs.readFileSync(customFile, "utf-8");
    expect(content).toContain("untouched");
  });

  it("handles multiple features", async () => {
    createFeatureYaml(tempDir, "widgets", MINIMAL_YAML);
    createFeatureYaml(tempDir, "contacts", CONTACTS_YAML);

    const result = await updateAction({}, tempDir);
    expect(result.success).toBe(true);
    expect(result.message).toContain("widgets");
    expect(result.message).toContain("contacts");
    expect(result.message).toContain("2 feature(s)");
  });

  it("YAML validation error reports clearly", async () => {
    // Create feather.yaml with invalid content (missing required name field)
    const featureDir = path.join(tempDir, "src", "features", "broken");
    fs.mkdirSync(featureDir, { recursive: true });
    fs.writeFileSync(
      path.join(featureDir, "feather.yaml"),
      "fields:\n  title:\n    type: string\n",
    );

    const result = await updateAction({}, tempDir);
    expect(result.message).toContain("ERROR");
  });
});

describe("feather update — registry sync", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "update-reg-test-"));
    setupTempProject(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("syncs from registry before regenerating when registry configured", async () => {
    // Write feather.yaml with registry config and a feature to sync
    fs.writeFileSync(
      path.join(tempDir, "feather.yaml"),
      "name: test\nfeatures:\n  - todos\nregistry:\n  url: https://raw.githubusercontent.com/org/repo/main/templates\n",
    );

    const todoManifest = {
      name: "todos",
      label: "Todos",
      description: "Todo feature",
      complexity: "simple",
      files: { frontend: "src/features/todos/" },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("bundles/todos/bundle.json")) {
          return { ok: false, status: 404, json: async () => ({}) } as Response;
        }
        if (url.includes("features/todos/manifest.json")) {
          return { ok: true, status: 200, json: async () => todoManifest } as Response;
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      }),
    );

    const result = await updateAction({}, tempDir);

    // Registry sync should have been attempted
    expect(result.message).toContain("Registry:");
    expect(result.message).toContain("Synced");
    expect(vi.mocked(fetch)).toHaveBeenCalled();
  });

  it("regenerates only when no registry configured (backward compat)", async () => {
    // No feather.yaml with registry config
    createFeatureYaml(tempDir, "widgets", `name: widgets\nlabel: Widget\nfields:\n  title:\n    type: string\n    required: true\n`);

    const result = await updateAction({}, tempDir);

    // No registry sync line in output
    expect(result.message).not.toContain("Registry:");
    // But regeneration still works
    expect(result.success).toBe(true);
    expect(result.message).toContain("widgets");
  });
});
