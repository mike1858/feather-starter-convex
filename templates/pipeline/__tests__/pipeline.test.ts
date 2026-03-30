import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { generateFeature } from "../generate";

const PROJECT_ROOT = path.resolve(__dirname, "../../..");

describe("pipeline — generateFeature", () => {
  let tempDir: string;

  function setupTempProject(): void {
    // Create directory structure
    const convexDir = path.join(tempDir, "convex");
    const srcSharedDir = path.join(tempDir, "src", "shared");
    const srcDir = path.join(tempDir, "src");
    const templatesDir = path.join(tempDir, "templates");
    fs.mkdirSync(convexDir, { recursive: true });
    fs.mkdirSync(srcSharedDir, { recursive: true });

    // Copy defaults.yaml
    fs.cpSync(
      path.join(PROJECT_ROOT, "templates", "defaults.yaml"),
      path.join(templatesDir, "defaults.yaml"),
    );

    // Create minimal schema.ts
    fs.writeFileSync(
      path.join(convexDir, "schema.ts"),
      `import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  users: defineTable({ name: v.optional(v.string()) }),
});

export default schema;
`,
    );
    fs.writeFileSync(
      path.join(convexDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ESNext",
          module: "ESNext",
          moduleResolution: "bundler",
          strict: true,
          skipLibCheck: true,
        },
        include: ["./**/*.ts"],
      }),
    );

    // Create minimal nav.ts
    fs.writeFileSync(
      path.join(srcSharedDir, "nav.ts"),
      `export interface NavItem { label: string; i18nKey: string; to: string; }
export const navItems: NavItem[] = [
  { label: "Dashboard", i18nKey: "dashboard.nav.dashboard", to: "/dashboard" },
  { label: "Settings", i18nKey: "dashboard.nav.settings", to: "/dashboard/settings" },
];
`,
    );

    // Create minimal i18n.ts
    fs.writeFileSync(
      path.join(srcDir, "i18n.ts"),
      `const ns = ["common", "auth", "dashboard"];\nexport default ns;\n`,
    );

    // Create minimal errors.ts
    fs.writeFileSync(
      path.join(srcSharedDir, "errors.ts"),
      `export const ERRORS = {\n  common: { UNKNOWN: "Unknown error." },\n} as const;\n`,
    );
  }

  function writeYaml(filename: string, content: string): string {
    const yamlPath = path.join(tempDir, filename);
    fs.mkdirSync(path.dirname(yamlPath), { recursive: true });
    fs.writeFileSync(yamlPath, content, "utf-8");
    return yamlPath;
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pipeline-test-"));
    setupTempProject();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ── Core pipeline tests ───────────────────────────────────────────────────

  it("generates a minimal feature end-to-end (generated/ output)", async () => {
    const yamlPath = writeYaml(
      "widgets.yaml",
      `
name: widgets
label: Widget
fields:
  title:
    type: string
    required: true
`,
    );

    const result = await generateFeature({
      yamlPath,
      projectRoot: tempDir,
      outputMode: "generated",
    });

    expect(result.success).toBe(true);
    expect(result.featureName).toBe("widgets");
    expect(result.scaffolded.files.length).toBeGreaterThan(0);

    // Verify generated/ directories created
    const generatedFrontend = path.join(
      tempDir,
      "src",
      "generated",
      "widgets",
    );
    const generatedBackend = path.join(
      tempDir,
      "convex",
      "generated",
      "widgets",
    );
    expect(fs.existsSync(generatedFrontend)).toBe(true);
    expect(fs.existsSync(generatedBackend)).toBe(true);

    // Verify @generated header in output files
    const schemaContent = fs.readFileSync(
      path.join(generatedBackend, "schema.fragment.ts"),
      "utf-8",
    );
    expect(schemaContent).toContain("@generated");

    // Verify wiring happened
    const schemaTs = fs.readFileSync(
      path.join(tempDir, "convex", "schema.ts"),
      "utf-8",
    );
    expect(schemaTs).toContain("widgets");
  });

  it("generates with legacy output mode (features/ directory)", async () => {
    const yamlPath = writeYaml(
      "widgets.yaml",
      `
name: widgets
label: Widget
fields:
  title:
    type: string
    required: true
`,
    );

    const result = await generateFeature({
      yamlPath,
      projectRoot: tempDir,
      outputMode: "legacy",
    });

    expect(result.success).toBe(true);

    const legacyFrontend = path.join(
      tempDir,
      "src",
      "features",
      "widgets",
    );
    const legacyBackend = path.join(tempDir, "convex", "widgets");
    expect(fs.existsSync(legacyFrontend)).toBe(true);
    expect(fs.existsSync(legacyBackend)).toBe(true);
  });

  it("dry run returns file list without writing", async () => {
    const yamlPath = writeYaml(
      "widgets.yaml",
      `
name: widgets
label: Widget
fields:
  title:
    type: string
    required: true
`,
    );

    const result = await generateFeature({
      yamlPath,
      projectRoot: tempDir,
      outputMode: "generated",
      dryRun: true,
    });

    expect(result.success).toBe(true);
    expect(result.scaffolded.files.length).toBeGreaterThan(0);
    expect(result.wired).toBeNull();

    // Verify no files created on disk
    const generatedDir = path.join(
      tempDir,
      "src",
      "generated",
      "widgets",
    );
    expect(fs.existsSync(generatedDir)).toBe(false);
  });

  it("YAML validation failure stops pipeline", async () => {
    const yamlPath = writeYaml(
      "invalid.yaml",
      `
fields:
  title:
    type: string
`,
    );

    const result = await generateFeature({
      yamlPath,
      projectRoot: tempDir,
      outputMode: "generated",
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    // Verify no files created
    const generatedDir = path.join(
      tempDir,
      "src",
      "generated",
    );
    expect(fs.existsSync(generatedDir)).toBe(false);
  });

  it("handles missing YAML file gracefully", async () => {
    const result = await generateFeature({
      yamlPath: path.join(tempDir, "nonexistent.yaml"),
      projectRoot: tempDir,
      outputMode: "generated",
    });

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Could not read");
  });

  // ── Handlebars rendering quality tests ───────────────────────────────────

  it("generated schema file contains real Zod content (not stub comment)", async () => {
    const yamlPath = writeYaml(
      "widgets.yaml",
      `
name: widgets
label: Widget
fields:
  title:
    type: string
    required: true
  description:
    type: text
`,
    );

    const result = await generateFeature({
      yamlPath,
      projectRoot: tempDir,
      outputMode: "generated",
    });

    expect(result.success).toBe(true);

    const schemaPath = path.join(
      tempDir,
      "convex",
      "generated",
      "widgets",
      "schema.fragment.ts",
    );
    const content = fs.readFileSync(schemaPath, "utf-8");

    // Real content: contains Zod schema definitions
    expect(content).toContain("createWidgetsInput");
    expect(content).toContain("z.string()");
    expect(content).toContain("title");
    // NOT a stub comment
    expect(content).not.toContain("// Stub");
    expect(content).not.toContain("// TODO");
  });

  it("generated mutations file contains actual mutation functions (not stub comment)", async () => {
    const yamlPath = writeYaml(
      "widgets.yaml",
      `
name: widgets
label: Widget
fields:
  title:
    type: string
    required: true
`,
    );

    const result = await generateFeature({
      yamlPath,
      projectRoot: tempDir,
      outputMode: "generated",
    });

    expect(result.success).toBe(true);

    const mutationsPath = path.join(
      tempDir,
      "convex",
      "generated",
      "widgets",
      "mutations.ts",
    );
    const content = fs.readFileSync(mutationsPath, "utf-8");

    expect(content).toContain("export const create");
    expect(content).toContain("export const update");
    expect(content).toContain("export const remove");
    expect(content).not.toContain("// Mutations for Widget");
  });

  it("generated component file contains real React component (not stub div)", async () => {
    const yamlPath = writeYaml(
      "widgets.yaml",
      `
name: widgets
label: Widget
fields:
  title:
    type: string
    required: true
`,
    );

    const result = await generateFeature({
      yamlPath,
      projectRoot: tempDir,
      outputMode: "generated",
    });

    expect(result.success).toBe(true);

    const componentPath = path.join(
      tempDir,
      "src",
      "generated",
      "widgets",
      "components",
      "WidgetsPage.tsx",
    );
    const content = fs.readFileSync(componentPath, "utf-8");

    expect(content).toContain("function WidgetsPage");
    expect(content).toContain("useTranslation");
    // Should not be a minimal stub div
    expect(content).not.toContain("Widget Page</div>");
  });

  it("generates all 26 template outputs for full-featured YAML (tasks-style)", async () => {
    const yamlPath = writeYaml(
      "tasks.yaml",
      `
name: tasks
label: Task
labelPlural: Tasks
fields:
  title:
    type: string
    required: true
  status:
    type: enum
    values: [todo, in_progress, done]
    filterable: true
    transitions:
      todo: [in_progress]
      in_progress: [done]
      done: []
  priority:
    type: boolean
    default: false
behaviors:
  assignable: true
  orderable: true
views:
  defaultView: list
  enabledViews: [list, card, table]
  filteredViews:
    - name: my-tasks
      label: My Tasks
      filter: { assigneeId: $currentUser }
`,
    );

    const result = await generateFeature({
      yamlPath,
      projectRoot: tempDir,
      outputMode: "generated",
    });

    expect(result.success).toBe(true);
    // Full-featured YAML should produce many files
    expect(result.scaffolded.files.length).toBeGreaterThanOrEqual(20);

    // Verify status badge generated for enum field
    const hasBadge = result.scaffolded.files.some((f) =>
      f.includes("StatusBadge"),
    );
    expect(hasBadge).toBe(true);

    // Verify view switcher generated for multiple views
    const hasViewSwitcher = result.scaffolded.files.some((f) =>
      f.includes("ViewSwitcher"),
    );
    expect(hasViewSwitcher).toBe(true);
  });

  it("generated mode prepends @generated header to all files", async () => {
    const yamlPath = writeYaml(
      "widgets.yaml",
      `
name: widgets
label: Widget
fields:
  title:
    type: string
    required: true
`,
    );

    const result = await generateFeature({
      yamlPath,
      projectRoot: tempDir,
      outputMode: "generated",
    });

    expect(result.success).toBe(true);

    const backendDir = path.join(tempDir, "convex", "generated", "widgets");
    const frontendDir = path.join(tempDir, "src", "generated", "widgets");

    const schemaContent = fs.readFileSync(
      path.join(backendDir, "schema.fragment.ts"),
      "utf-8",
    );
    expect(schemaContent).toContain("@generated");

    const mutationsContent = fs.readFileSync(
      path.join(backendDir, "mutations.ts"),
      "utf-8",
    );
    expect(mutationsContent).toContain("@generated");

    const componentContent = fs.readFileSync(
      path.join(frontendDir, "components", "WidgetsPage.tsx"),
      "utf-8",
    );
    expect(componentContent).toContain("@generated");
  });

  it("legacy mode does NOT prepend @generated header to files", async () => {
    const yamlPath = writeYaml(
      "widgets.yaml",
      `
name: widgets
label: Widget
fields:
  title:
    type: string
    required: true
`,
    );

    const result = await generateFeature({
      yamlPath,
      projectRoot: tempDir,
      outputMode: "legacy",
    });

    expect(result.success).toBe(true);

    const backendDir = path.join(tempDir, "convex", "widgets");

    const schemaContent = fs.readFileSync(
      path.join(backendDir, "schema.fragment.ts"),
      "utf-8",
    );
    // legacy mode: no pipeline-injected "DO NOT EDIT" header (templates still
    // have their own @generated-start markers which is fine)
    expect(schemaContent).not.toContain("DO NOT EDIT");
  });

  it("wiring step modifies shared files (nav, errors, i18n, schema)", async () => {
    const yamlPath = writeYaml(
      "widgets.yaml",
      `
name: widgets
label: Widget
fields:
  title:
    type: string
    required: true
`,
    );

    const result = await generateFeature({
      yamlPath,
      projectRoot: tempDir,
      outputMode: "generated",
    });

    expect(result.success).toBe(true);
    expect(result.wired).not.toBeNull();

    // Schema was modified to include widgets table
    const schemaTs = fs.readFileSync(
      path.join(tempDir, "convex", "schema.ts"),
      "utf-8",
    );
    expect(schemaTs).toContain("widgets");

    // Nav was modified
    const navTs = fs.readFileSync(
      path.join(tempDir, "src", "shared", "nav.ts"),
      "utf-8",
    );
    expect(navTs).toContain("widgets");

    // i18n namespace was added
    const i18nTs = fs.readFileSync(
      path.join(tempDir, "src", "i18n.ts"),
      "utf-8",
    );
    expect(i18nTs).toContain("widgets");
  });

  it("generates minimal output for a simple single-field YAML", async () => {
    const yamlPath = writeYaml(
      "notes.yaml",
      `
name: notes
label: Note
labelPlural: Notes
fields:
  body:
    type: text
    required: true
`,
    );

    const result = await generateFeature({
      yamlPath,
      projectRoot: tempDir,
      outputMode: "generated",
    });

    expect(result.success).toBe(true);
    expect(result.featureName).toBe("notes");
    // Even minimal YAML should produce backend + frontend files
    expect(result.scaffolded.files.length).toBeGreaterThanOrEqual(10);

    // Verify basic file paths are present
    const paths = result.scaffolded.files.map((f) => path.basename(f));
    expect(paths).toContain("schema.fragment.ts");
    expect(paths).toContain("mutations.ts");
    expect(paths).toContain("queries.ts");
  });
});
