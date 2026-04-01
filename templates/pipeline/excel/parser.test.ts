import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseExcelWorkbook, detectCellType, isDateLike } from "./parser";

/** Helper: create a workbook ArrayBuffer from array-of-arrays data */
function createWorkbook(
  sheets: Record<string, unknown[][]>,
): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const [name, data] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return buf;
}

describe("parseExcelWorkbook", () => {
  it("parses a single-sheet workbook with headers and data rows", () => {
    const data = createWorkbook({
      Employees: [
        ["Name", "Age", "Active"],
        ["Alice", 30, true],
        ["Bob", 25, false],
      ],
    });

    const result = parseExcelWorkbook(data, "test.xlsx");
    expect(result.fileName).toBe("test.xlsx");
    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].name).toBe("Employees");
    expect(result.sheets[0].rowCount).toBe(2);
    expect(result.sheets[0].columnCount).toBe(3);
  });

  it("handles empty sheets (rowCount 0, no columns)", () => {
    const data = createWorkbook({ Empty: [] });
    const result = parseExcelWorkbook(data, "empty.xlsx");
    expect(result.sheets[0].rowCount).toBe(0);
    expect(result.sheets[0].columns).toHaveLength(0);
    expect(result.sheets[0].sampleRows).toHaveLength(0);
  });

  it("detects number cell type for numeric columns", () => {
    const data = createWorkbook({
      Data: [
        ["Amount"],
        [100],
        [200.5],
        [300],
      ],
    });

    const result = parseExcelWorkbook(data, "numbers.xlsx");
    expect(result.sheets[0].columns[0].detectedType).toBe("number");
  });

  it("detects string cell type for text columns", () => {
    const data = createWorkbook({
      Data: [
        ["City"],
        ["New York"],
        ["London"],
        ["Tokyo"],
      ],
    });

    const result = parseExcelWorkbook(data, "strings.xlsx");
    expect(result.sheets[0].columns[0].detectedType).toBe("string");
  });

  it("detects boolean cell type", () => {
    const data = createWorkbook({
      Data: [
        ["Active"],
        [true],
        [false],
        [true],
      ],
    });

    const result = parseExcelWorkbook(data, "bools.xlsx");
    expect(result.sheets[0].columns[0].detectedType).toBe("boolean");
  });

  it("extracts correct sample row count", () => {
    const rows = Array.from({ length: 20 }, (_, i) => [`Row ${i}`]);
    const data = createWorkbook({
      Data: [["Name"], ...rows],
    });

    const result = parseExcelWorkbook(data, "many.xlsx", 3);
    expect(result.sheets[0].sampleRows).toHaveLength(3);
    expect(result.sheets[0].columns[0].sampleValues).toHaveLength(3);
  });

  it("counts unique values and empty cells per column", () => {
    const data = createWorkbook({
      Data: [
        ["Status", "Extra"],
        ["Active", "x"],
        ["Active", "y"],
        ["Inactive", "z"],
        [null, "w"], // Status is empty but row has data in Extra
      ],
    });

    const result = parseExcelWorkbook(data, "counts.xlsx");
    const col = result.sheets[0].columns[0];
    expect(col.uniqueCount).toBe(2); // Active, Inactive
    expect(col.emptyCount).toBe(1); // one null in Status column
  });

  it("handles multi-sheet workbooks", () => {
    const data = createWorkbook({
      Tasks: [
        ["Title"],
        ["Task 1"],
      ],
      Projects: [
        ["Name"],
        ["Project A"],
      ],
    });

    const result = parseExcelWorkbook(data, "multi.xlsx");
    expect(result.sheets).toHaveLength(2);
    expect(result.sheets[0].name).toBe("Tasks");
    expect(result.sheets[1].name).toBe("Projects");
  });

  it("trims whitespace from header names", () => {
    const data = createWorkbook({
      Data: [
        ["  Name  ", " Age "],
        ["Alice", 30],
      ],
    });

    const result = parseExcelWorkbook(data, "spaces.xlsx");
    expect(result.sheets[0].columns[0].name).toBe("Name");
    expect(result.sheets[0].columns[1].name).toBe("Age");
  });

  it("filters out entirely empty data rows", () => {
    const data = createWorkbook({
      Data: [
        ["Name", "Value"],
        ["A", 1],
        [null, null],
        ["B", 2],
      ],
    });

    const result = parseExcelWorkbook(data, "gaps.xlsx");
    expect(result.sheets[0].rowCount).toBe(2);
  });
});

describe("detectCellType", () => {
  it("returns empty for no values", () => {
    expect(detectCellType([])).toBe("empty");
  });

  it("detects predominant type when mixed", () => {
    // 3 numbers, 1 string -> number
    expect(detectCellType([1, 2, 3, "text"])).toBe("number");
  });

  it("detects date from Date objects", () => {
    expect(
      detectCellType([new Date("2024-01-01"), new Date("2024-02-01")]),
    ).toBe("date");
  });
});

describe("isDateLike", () => {
  it("matches YYYY-MM-DD format", () => {
    expect(isDateLike("2024-01-15")).toBe(true);
  });

  it("matches MM/DD/YYYY format", () => {
    expect(isDateLike("01/15/2024")).toBe(true);
  });

  it("matches Jan 15, 2024 format", () => {
    expect(isDateLike("Jan 15, 2024")).toBe(true);
  });

  it("matches 15 Jan 2024 format", () => {
    expect(isDateLike("15 Jan 2024")).toBe(true);
  });

  it("rejects non-date strings", () => {
    expect(isDateLike("hello world")).toBe(false);
    expect(isDateLike("12345")).toBe(false);
  });
});
