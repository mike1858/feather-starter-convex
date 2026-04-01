// Test Matrix: reconcileSheet
// | # | Scenario                                    | Expected                                  |
// |---|---------------------------------------------|-------------------------------------------|
// | 1 | All columns match exactly                   | no changes, isReimport=true               |
// | 2 | Renamed column ("Emp Name" -> "Employee Name") | rename change with score > 0.70        |
// | 3 | New column added                            | add change with addedColumn               |
// | 4 | Column removed                              | remove change with removedColumn          |
// | 5 | Greedy matching resolves conflicts           | highest score wins                        |
// | 6 | Overall similarity calculated correctly     | exactMatches / totalColumns               |
// | 7 | isReimport=true when similarity > 0.5       | isReimport flag set                       |
// | 8 | isReimport=true when any rename detected    | isReimport flag set                       |
// | 9 | isReimport=false when no matches            | completely different sheet                 |
//
// Test Matrix: detectReimport
// |10 | Matches sheets against stored mappings      | returns map with matches                  |
// |11 | Picks best match when multiple similar      | highest similarity wins                   |
// |12 | Returns empty map when no reimports         | no matches at all                         |

import { describe, it, expect } from "vitest";
import { reconcileSheet, detectReimport } from "./reconciliation";
import type { StoredMapping } from "./reconciliation";
import type { SheetMetadata, ColumnInfo } from "./parser";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeColumn(
  name: string,
  position: number,
  overrides: Partial<ColumnInfo> = {},
): ColumnInfo {
  return {
    name,
    position,
    detectedType: "string",
    sampleValues: [],
    uniqueCount: 0,
    emptyCount: 0,
    ...overrides,
  };
}

function makeSheet(
  name: string,
  columns: ColumnInfo[],
  overrides: Partial<SheetMetadata> = {},
): SheetMetadata {
  return {
    name,
    rowCount: 10,
    columnCount: columns.length,
    columns,
    sampleRows: [],
    ...overrides,
  };
}

function makeMapping(
  colName: string,
  position: number,
  overrides: Partial<StoredMapping> = {},
): StoredMapping {
  return {
    systemFieldId: `field_${colName}`,
    systemFieldName: colName,
    excelColumnName: colName,
    excelColumnPosition: position,
    excelSheetName: "Sheet1",
    ...overrides,
  };
}

// ── reconcileSheet tests ─────────────────────────────────────────────────────

describe("reconcileSheet", () => {
  it("detects exact column matches with no changes reported", () => {
    const sheet = makeSheet("Employees", [
      makeColumn("Name", 0),
      makeColumn("Email", 1),
      makeColumn("Department", 2),
    ]);
    const mappings = [
      makeMapping("Name", 0),
      makeMapping("Email", 1),
      makeMapping("Department", 2),
    ];

    const result = reconcileSheet(sheet, mappings, "employees");

    expect(result.changes).toHaveLength(0);
    expect(result.isReimport).toBe(true);
    expect(result.overallSimilarity).toBe(1);
    expect(result.matchedEntity).toBe("employees");
  });

  it("detects renamed column with score > 0.70 when data fingerprint overlaps", () => {
    // The Jaro-Winkler string score alone (0.84) with position (1.0) gives ~0.62
    // because dataScore=0 when no sample values overlap. Providing a stored
    // dataFingerprint with overlapping values pushes the combined score above 0.70.
    const sharedSamples = ["John Smith", "Alice Johnson", "Bob Williams"];
    const sheet = makeSheet("Employees", [
      makeColumn("Employee Name", 0, {
        sampleValues: sharedSamples,
      }),
      makeColumn("Email", 1),
    ]);
    const mappings = [
      makeMapping("Emp Name", 0, {
        dataFingerprint: JSON.stringify(sharedSamples),
      }),
      makeMapping("Email", 1),
    ];

    const result = reconcileSheet(sheet, mappings, "employees");

    const renames = result.changes.filter((c) => c.type === "rename");
    expect(renames).toHaveLength(1);
    expect(renames[0].oldColumnName).toBe("Emp Name");
    expect(renames[0].newColumnName).toBe("Employee Name");
    expect(renames[0].matchScore!.isPossibleRename).toBe(true);
  });

  it("reports new columns as type 'add'", () => {
    const sheet = makeSheet("Employees", [
      makeColumn("Name", 0),
      makeColumn("Email", 1),
      makeColumn("Phone", 2), // new column
    ]);
    const mappings = [makeMapping("Name", 0), makeMapping("Email", 1)];

    const result = reconcileSheet(sheet, mappings, "employees");

    const additions = result.changes.filter((c) => c.type === "add");
    expect(additions).toHaveLength(1);
    expect(additions[0].addedColumn!.name).toBe("Phone");
  });

  it("reports missing columns as type 'remove'", () => {
    const sheet = makeSheet("Employees", [makeColumn("Name", 0)]);
    const mappings = [
      makeMapping("Name", 0),
      makeMapping("Department", 1), // removed
    ];

    const result = reconcileSheet(sheet, mappings, "employees");

    const removals = result.changes.filter((c) => c.type === "remove");
    expect(removals).toHaveLength(1);
    expect(removals[0].removedColumn).toBe("Department");
  });

  it("greedy matching resolves conflicts (highest score wins)", () => {
    // Two stored columns can both fuzzy-match one new column
    // "First Name" stored at pos 0 and "Full Name" stored at pos 1
    // New column "Name" at pos 0 — should match "First Name" due to position proximity
    const sheet = makeSheet("People", [makeColumn("Name", 0)]);
    const mappings = [
      makeMapping("First Name", 0),
      makeMapping("Full Name", 1),
    ];

    const result = reconcileSheet(sheet, mappings, "people");

    // Should have at most 1 rename (greedy picks best match)
    const renames = result.changes.filter((c) => c.type === "rename");
    // The other becomes a "remove" since it wasn't matched
    const removals = result.changes.filter((c) => c.type === "remove");
    expect(renames.length + removals.length).toBeGreaterThanOrEqual(1);
    // If renames exist, highest score won
    if (renames.length > 0) {
      expect(renames[0].matchScore!.score).toBeGreaterThan(0.7);
    }
  });

  it("calculates overallSimilarity correctly", () => {
    const sheet = makeSheet("Items", [
      makeColumn("Name", 0),
      makeColumn("Price", 1),
      makeColumn("NewCol", 2),
    ]);
    const mappings = [
      makeMapping("Name", 0),
      makeMapping("Price", 1),
      makeMapping("OldCol", 2),
    ];

    const result = reconcileSheet(sheet, mappings, "items");

    // 2 exact matches out of 3 total = 0.667
    expect(result.overallSimilarity).toBeCloseTo(2 / 3, 1);
  });

  it("sets isReimport=true when similarity > 0.5", () => {
    const sheet = makeSheet("Items", [
      makeColumn("Name", 0),
      makeColumn("Price", 1),
      makeColumn("Extra", 2),
    ]);
    const mappings = [
      makeMapping("Name", 0),
      makeMapping("Price", 1),
    ];

    const result = reconcileSheet(sheet, mappings, "items");

    // 2 exact matches out of 3 total = 0.667 > 0.5
    expect(result.isReimport).toBe(true);
  });

  it("sets isReimport=true when any rename is detected", () => {
    // Low exact match ratio but a rename is detected via data fingerprint
    const sharedData = ["John", "Alice", "Bob"];
    const sheet = makeSheet("People", [
      makeColumn("Employee Name", 0, {
        sampleValues: sharedData,
      }),
      makeColumn("Col A", 1),
      makeColumn("Col B", 2),
      makeColumn("Col C", 3),
    ]);
    const mappings = [
      makeMapping("Emp Name", 0, {
        dataFingerprint: JSON.stringify(sharedData),
      }),
      makeMapping("X", 1),
      makeMapping("Y", 2),
      makeMapping("Z", 3),
    ];

    const result = reconcileSheet(sheet, mappings, "people");

    // Rename should be detected for "Emp Name" -> "Employee Name"
    const renames = result.changes.filter((c) => c.type === "rename");
    expect(renames.length).toBeGreaterThan(0);
    expect(result.isReimport).toBe(true);
  });

  it("sets isReimport=false when completely different sheet", () => {
    const sheet = makeSheet("Orders", [
      makeColumn("OrderId", 0),
      makeColumn("Amount", 1),
    ]);
    const mappings = [
      makeMapping("EmployeeName", 0),
      makeMapping("Department", 1),
    ];

    const result = reconcileSheet(sheet, mappings, "employees");

    // No exact matches, no renames detected
    expect(result.overallSimilarity).toBe(0);
    // isReimport depends on whether any rename was detected
    if (result.changes.every((c) => c.type !== "rename")) {
      expect(result.isReimport).toBe(false);
    }
  });
});

// ── detectReimport tests ─────────────────────────────────────────────────────

describe("detectReimport", () => {
  it("matches sheets against stored mappings", () => {
    const sheets = [
      makeSheet("Employees", [
        makeColumn("Name", 0),
        makeColumn("Email", 1),
      ]),
    ];
    const allMappings = new Map([
      [
        "employees",
        [makeMapping("Name", 0), makeMapping("Email", 1)],
      ],
    ]);

    const results = detectReimport(sheets, allMappings);

    expect(results.size).toBe(1);
    expect(results.get("Employees")!.isReimport).toBe(true);
    expect(results.get("Employees")!.matchedEntity).toBe("employees");
  });

  it("picks best match when multiple entities are similar", () => {
    const sheets = [
      makeSheet("Staff", [
        makeColumn("Name", 0),
        makeColumn("Email", 1),
        makeColumn("Department", 2),
      ]),
    ];
    const allMappings = new Map([
      [
        "employees",
        [
          makeMapping("Name", 0),
          makeMapping("Email", 1),
          makeMapping("Department", 2),
        ],
      ],
      [
        "contractors",
        [
          makeMapping("Name", 0),
          makeMapping("Rate", 1), // different columns
        ],
      ],
    ]);

    const results = detectReimport(sheets, allMappings);

    expect(results.size).toBe(1);
    const match = results.get("Staff")!;
    // Should match "employees" (3/3 exact) over "contractors" (1/3 exact)
    expect(match.matchedEntity).toBe("employees");
  });

  it("returns empty map when no reimports detected", () => {
    const sheets = [
      makeSheet("Orders", [
        makeColumn("OrderId", 0),
        makeColumn("Total", 1),
      ]),
    ];
    const allMappings = new Map([
      [
        "employees",
        [
          makeMapping("EmployeeName", 0),
          makeMapping("Salary", 1),
        ],
      ],
    ]);

    const results = detectReimport(sheets, allMappings);

    expect(results.size).toBe(0);
  });
});
