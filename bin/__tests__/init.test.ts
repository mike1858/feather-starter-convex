import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { initAction } from "../commands/init";

describe("feather init", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "init-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates directory structure and root feather.yaml", () => {
    const result = initAction({}, tempDir);
    expect(result.success).toBe(true);

    // Verify feather.yaml exists
    expect(fs.existsSync(path.join(tempDir, "feather.yaml"))).toBe(true);

    // Verify directory structure
    const expectedDirs = [
      "src/generated",
      "src/custom",
      "convex/generated",
      "convex/custom",
    ];
    for (const dir of expectedDirs) {
      expect(fs.existsSync(path.join(tempDir, dir))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, dir, ".gitkeep"))).toBe(true);
    }
  });

  it("uses --name option for project name", () => {
    const result = initAction({ name: "my-app" }, tempDir);
    expect(result.success).toBe(true);

    const yamlContent = fs.readFileSync(
      path.join(tempDir, "feather.yaml"),
      "utf-8",
    );
    expect(yamlContent).toContain("name: my-app");
    expect(yamlContent).toContain("appName: my-app");
  });

  it("defaults project name to directory basename", () => {
    const result = initAction({}, tempDir);
    expect(result.success).toBe(true);

    const yamlContent = fs.readFileSync(
      path.join(tempDir, "feather.yaml"),
      "utf-8",
    );
    // tempDir basename is something like "init-test-XXXXX"
    const basename = path.basename(tempDir);
    expect(yamlContent).toContain(`name: ${basename}`);
  });

  it("is idempotent — skips existing directories", () => {
    // First init
    const first = initAction({}, tempDir);
    expect(first.success).toBe(true);
    expect(first.message).toContain("Created");

    // Second init — should indicate already initialized
    const second = initAction({}, tempDir);
    expect(second.success).toBe(true);
    expect(second.message).toContain("already initialized");
  });

  it("does not overwrite existing feather.yaml", () => {
    // Create a custom feather.yaml before init
    const customContent = "name: custom-project\nversion: 99.0.0\n";
    fs.writeFileSync(path.join(tempDir, "feather.yaml"), customContent);

    const result = initAction({}, tempDir);
    expect(result.success).toBe(true);

    // Verify original content preserved
    const yamlContent = fs.readFileSync(
      path.join(tempDir, "feather.yaml"),
      "utf-8",
    );
    expect(yamlContent).toBe(customContent);
  });

  it("creates valid YAML with expected structure", () => {
    initAction({ name: "test-proj" }, tempDir);

    const yamlContent = fs.readFileSync(
      path.join(tempDir, "feather.yaml"),
      "utf-8",
    );

    // Verify key YAML fields exist
    expect(yamlContent).toContain("name: test-proj");
    expect(yamlContent).toContain("version: 1.0.0");
    expect(yamlContent).toContain("appName: test-proj");
    expect(yamlContent).toContain("features: []");
    expect(yamlContent).toContain("languages:");
    expect(yamlContent).toContain("providers:");
  });
});
