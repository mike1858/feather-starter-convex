import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { importCommand } from "../commands/import";

// ── Mock clack prompts (interactive CLI) ─────────────────────────────────────

const mockIntro = vi.fn();
const mockCancel = vi.fn();
const mockNote = vi.fn();
const mockConfirm = vi.fn().mockResolvedValue(true);
const mockIsCancel = vi.fn().mockReturnValue(false);
const mockOutro = vi.fn();
const mockSpinnerStart = vi.fn();
const mockSpinnerStop = vi.fn();

vi.mock("@clack/prompts", () => ({
  intro: (...args: unknown[]) => mockIntro(...args),
  cancel: (...args: unknown[]) => mockCancel(...args),
  spinner: () => ({
    start: mockSpinnerStart,
    stop: mockSpinnerStop,
  }),
  note: (...args: unknown[]) => mockNote(...args),
  confirm: (...args: unknown[]) => mockConfirm(...args),
  isCancel: (...args: unknown[]) => mockIsCancel(...args),
  outro: (...args: unknown[]) => mockOutro(...args),
}));

// ── Mock xlsx ────────────────────────────────────────────────────────────────

const mockXlsxRead = vi.fn().mockReturnValue({
  SheetNames: ["Tasks"],
  Sheets: { Tasks: { "!ref": "A1:C3" } },
});
// header:1 mode returns array-of-arrays: first row = headers, rest = data
const mockSheetToJson = vi.fn().mockReturnValue([
  ["title", "priority", "due_date"],
  ["Test Task", "high", "2026-01-15"],
  ["Another Task", "low", "2026-02-01"],
]);

vi.mock("xlsx", () => ({
  read: (...args: unknown[]) => mockXlsxRead(...args),
  utils: {
    sheet_to_json: (...args: unknown[]) => mockSheetToJson(...args),
  },
}));

// ── Mock generateFeature ─────────────────────────────────────────────────────

const mockGenerateFeature = vi.fn().mockResolvedValue({
  success: true,
  featureName: "tasks",
  scaffolded: { files: [], outputDir: "" },
  wired: null,
  errors: [],
});

vi.mock("../../templates/pipeline/generate", () => ({
  generateFeature: (...args: unknown[]) => mockGenerateFeature(...args),
}));

describe("feather import command", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "import-test-"));
    vi.clearAllMocks();

    // Reset xlsx mock defaults
    mockXlsxRead.mockReturnValue({
      SheetNames: ["Tasks"],
      Sheets: { Tasks: { "!ref": "A1:C3" } },
    });
    mockSheetToJson.mockReturnValue([
      ["title", "priority", "due_date"],
      ["Test Task", "high", "2026-01-15"],
      ["Another Task", "low", "2026-02-01"],
    ]);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("registers as Commander command with correct structure", () => {
    expect(importCommand.name()).toBe("import");
    expect(importCommand.description()).toContain("Import an Excel file");

    // Check argument
    const args = importCommand.registeredArguments;
    expect(args).toHaveLength(1);
    expect(args[0].name()).toBe("file");
    expect(args[0].required).toBe(true);

    // Check options
    const optionFlags = importCommand.options.map((o) => o.long);
    expect(optionFlags).toContain("--generate");
    expect(optionFlags).toContain("--output");
    expect(optionFlags).toContain("--no-confirm");
  });

  it("rejects non-Excel file extensions", async () => {
    const csvFile = path.join(tempDir, "data.csv");
    fs.writeFileSync(csvFile, "a,b,c\n1,2,3\n");

    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    await expect(
      importCommand.parseAsync(["node", "feather", csvFile]),
    ).rejects.toThrow("process.exit");

    expect(mockCancel).toHaveBeenCalledWith(
      "Only .xlsx and .xls files are supported",
    );
    mockExit.mockRestore();
  });

  it("rejects missing files", async () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    await expect(
      importCommand.parseAsync(["node", "feather", "/nonexistent/data.xlsx"]),
    ).rejects.toThrow("process.exit");

    expect(mockCancel).toHaveBeenCalledWith(
      expect.stringContaining("File not found"),
    );
    mockExit.mockRestore();
  });

  it("parses Excel and generates YAML files with --no-confirm", async () => {
    const xlsxFile = path.join(tempDir, "data.xlsx");
    fs.writeFileSync(xlsxFile, "fake-excel-content");

    await importCommand.parseAsync([
      "node",
      "feather",
      xlsxFile,
      "--no-confirm",
      "--output",
      tempDir,
    ]);

    // Should have generated a feather.yaml in the output directory
    const yamlPath = path.join(
      tempDir,
      "src",
      "features",
      "tasks",
      "feather.yaml",
    );
    expect(fs.existsSync(yamlPath)).toBe(true);

    const content = fs.readFileSync(yamlPath, "utf-8");
    expect(content).toContain("name: tasks");
    expect(content).toContain("fields:");
  });

  it("shows import order for multi-entity workbooks", async () => {
    // Override xlsx mock for multi-sheet
    mockXlsxRead.mockReturnValueOnce({
      SheetNames: ["Projects", "Tasks"],
      Sheets: {
        Projects: { "!ref": "A1:A2" },
        Tasks: { "!ref": "A1:B2" },
      },
    });
    mockSheetToJson
      .mockReturnValueOnce([
        ["name"],
        ["Project A"],
      ])
      .mockReturnValueOnce([
        ["title", "project_id"],
        ["Task 1", "1"],
      ]);

    const xlsxFile = path.join(tempDir, "multi.xlsx");
    fs.writeFileSync(xlsxFile, "fake-excel-content");

    await importCommand.parseAsync([
      "node",
      "feather",
      xlsxFile,
      "--no-confirm",
      "--output",
      tempDir,
    ]);

    // Should show import order note for multi-entity (3 calls: entities summary, import order)
    // note is called at least twice: once for "Detected entities" and once for "Recommended import order"
    const noteCallArgs = mockNote.mock.calls.map(
      (call: unknown[]) => call[1] as string,
    );
    expect(noteCallArgs).toContain("Detected entities");
    expect(noteCallArgs).toContain(
      "Recommended import order (dependencies first)",
    );
  });

  it("triggers code generation with --generate flag", async () => {
    const xlsxFile = path.join(tempDir, "gen.xlsx");
    fs.writeFileSync(xlsxFile, "fake-excel-content");

    await importCommand.parseAsync([
      "node",
      "feather",
      xlsxFile,
      "--no-confirm",
      "--generate",
      "--output",
      tempDir,
    ]);

    expect(mockGenerateFeature).toHaveBeenCalled();
  });

  it("shows correct outro message without --generate", async () => {
    const xlsxFile = path.join(tempDir, "data.xlsx");
    fs.writeFileSync(xlsxFile, "fake-excel-content");

    await importCommand.parseAsync([
      "node",
      "feather",
      xlsxFile,
      "--no-confirm",
      "--output",
      tempDir,
    ]);

    expect(mockOutro).toHaveBeenCalledWith(
      expect.stringContaining("Run with --generate to also generate code."),
    );
  });
});
