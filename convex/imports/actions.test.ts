import { describe, it, expect, vi } from "vitest";
import type { SheetMetadata } from "../../templates/pipeline/excel/parser";

// ── Mock @anthropic-ai/sdk before importing action module ───────────────────

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(),
}));

// ── Import after mocks ─────────────────────────────────────────────────────

const { analyzeWithHeuristics, buildAnalysisPrompt } = await import("./actions");

// ── Test Data ──────────────────────────────────────────────────────────────

function makeSheet(overrides: Partial<SheetMetadata> & { name: string }): SheetMetadata {
  return {
    rowCount: 10,
    columnCount: 3,
    columns: [],
    sampleRows: [],
    ...overrides,
  };
}

// ── analyzeWithHeuristics ──────────────────────────────────────────────────

describe("analyzeWithHeuristics", () => {
  it("returns AnalysisResult with method 'heuristic'", () => {
    const sheets: SheetMetadata[] = [
      makeSheet({
        name: "Employees",
        rowCount: 5,
        columnCount: 2,
        columns: [
          {
            name: "Name",
            position: 0,
            detectedType: "string",
            sampleValues: ["Alice", "Bob", "Charlie"],
            uniqueCount: 3,
            emptyCount: 0,
          },
          {
            name: "Email",
            position: 1,
            detectedType: "string",
            sampleValues: ["alice@example.com", "bob@example.com", "charlie@example.com"],
            uniqueCount: 3,
            emptyCount: 0,
          },
        ],
        sampleRows: [
          ["Alice", "alice@example.com"],
          ["Bob", "bob@example.com"],
        ],
      }),
    ];

    const result = analyzeWithHeuristics(sheets);

    expect(result.method).toBe("heuristic");
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].name).toBe("employees");
    expect(result.importOrder).toHaveLength(1);
    expect(result.importOrder[0]).toBe("employees");
  });

  it("returns empty entities for sheets with no data", () => {
    const sheets: SheetMetadata[] = [
      makeSheet({
        name: "Empty",
        rowCount: 0,
        columnCount: 0,
        columns: [],
      }),
    ];

    const result = analyzeWithHeuristics(sheets);

    expect(result.method).toBe("heuristic");
    expect(result.entities).toHaveLength(0);
    expect(result.relationships).toHaveLength(0);
  });

  it("detects relationships between entities", () => {
    const sheets: SheetMetadata[] = [
      makeSheet({
        name: "Departments",
        rowCount: 3,
        columns: [
          {
            name: "Name",
            position: 0,
            detectedType: "string",
            sampleValues: ["Engineering", "Sales", "Marketing"],
            uniqueCount: 3,
            emptyCount: 0,
          },
        ],
      }),
      makeSheet({
        name: "Employees",
        rowCount: 10,
        columns: [
          {
            name: "Name",
            position: 0,
            detectedType: "string",
            sampleValues: ["Alice", "Bob", "Charlie", "Diana"],
            uniqueCount: 10,
            emptyCount: 0,
          },
          {
            name: "departmentId",
            position: 1,
            detectedType: "string",
            sampleValues: ["1", "2", "1"],
            uniqueCount: 3,
            emptyCount: 0,
          },
        ],
      }),
    ];

    const result = analyzeWithHeuristics(sheets);

    expect(result.relationships.length).toBeGreaterThanOrEqual(1);
    const deptRel = result.relationships.find(
      (r) => r.sourceEntity === "employees" && r.targetEntity === "departments",
    );
    expect(deptRel).toBeDefined();
    expect(deptRel!.type).toBe("belongs_to");
  });
});

// ── buildAnalysisPrompt ────────────────────────────────────────────────────

describe("buildAnalysisPrompt", () => {
  it("produces a prompt string containing sheet data as JSON", () => {
    const sheets: SheetMetadata[] = [
      makeSheet({
        name: "Products",
        rowCount: 5,
        columns: [
          {
            name: "Name",
            position: 0,
            detectedType: "string",
            sampleValues: ["Widget", "Gadget"],
            uniqueCount: 5,
            emptyCount: 0,
          },
          {
            name: "Price",
            position: 1,
            detectedType: "number",
            sampleValues: [9.99, 19.99],
            uniqueCount: 5,
            emptyCount: 0,
          },
        ],
        sampleRows: [["Widget", 9.99], ["Gadget", 19.99]],
      }),
    ];

    const prompt = buildAnalysisPrompt(sheets);

    expect(prompt).toContain("Products");
    expect(prompt).toContain("Name");
    expect(prompt).toContain("Price");
    expect(prompt).toContain("entity-name");
    expect(prompt).toContain("importOrder");
    // Verify it's valid JSON embedded in the prompt
    expect(prompt).toContain('"rowCount": 5');
  });

  it("limits sample values to 3 per column", () => {
    const sheets: SheetMetadata[] = [
      makeSheet({
        name: "Test",
        rowCount: 10,
        columns: [
          {
            name: "Col",
            position: 0,
            detectedType: "string",
            sampleValues: ["a", "b", "c", "d", "e"],
            uniqueCount: 5,
            emptyCount: 0,
          },
        ],
        sampleRows: [["a"], ["b"], ["c"], ["d"], ["e"]],
      }),
    ];

    const prompt = buildAnalysisPrompt(sheets);
    // Parse the JSON from the prompt to check sample values
    const jsonMatch = prompt.match(/Workbook data:\n([\s\S]*?)\n\nFor each/);
    expect(jsonMatch).toBeTruthy();
    const parsed = JSON.parse(jsonMatch![1]);
    expect(parsed[0].columns[0].sampleValues).toHaveLength(3);
    expect(parsed[0].sampleRows).toHaveLength(3);
  });

  it("includes all required instruction sections in the prompt", () => {
    const sheets: SheetMetadata[] = [makeSheet({ name: "Test", rowCount: 1, columns: [] })];

    const prompt = buildAnalysisPrompt(sheets);

    expect(prompt).toContain("Entity name (kebab-case)");
    expect(prompt).toContain("belongs_to or has_many");
    expect(prompt).toContain("topological sort");
    expect(prompt).toContain("Return ONLY valid JSON");
  });
});
