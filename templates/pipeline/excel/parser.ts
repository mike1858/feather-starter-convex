import * as XLSX from "xlsx";

export interface SheetMetadata {
  name: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnInfo[];
  sampleRows: unknown[][];
}

export interface ColumnInfo {
  name: string;
  position: number;
  detectedType: "string" | "number" | "boolean" | "date" | "empty";
  sampleValues: unknown[];
  uniqueCount: number;
  emptyCount: number;
}

export interface ParsedWorkbook {
  fileName: string;
  sheets: SheetMetadata[];
}

/**
 * Parse an Excel workbook from an ArrayBuffer.
 * Extracts sheet metadata, column info, and sample rows.
 * @param data - ArrayBuffer of the Excel file
 * @param fileName - Original filename for reference
 * @param sampleRowCount - Number of sample rows to extract (default 5)
 */
export function parseExcelWorkbook(
  data: ArrayBuffer,
  fileName: string,
  sampleRowCount = 5,
): ParsedWorkbook {
  const workbook = XLSX.read(data, { type: "array", cellDates: true });

  const sheets: SheetMetadata[] = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet["!ref"]) {
      return {
        name: sheetName,
        rowCount: 0,
        columnCount: 0,
        columns: [],
        sampleRows: [],
      };
    }

    // Get all data as array of arrays with raw types
    const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: null,
    });

    if (rawData.length === 0) {
      return {
        name: sheetName,
        rowCount: 0,
        columnCount: 0,
        columns: [],
        sampleRows: [],
      };
    }

    // First row is headers
    const headers = (rawData[0] as unknown[]).map((h) =>
      h != null ? String(h).trim() : "",
    );
    const dataRows = rawData.slice(1).filter((row) =>
      row.some((cell) => cell != null && String(cell).trim() !== ""),
    );

    const columns: ColumnInfo[] = headers.map((name, position) => {
      const columnValues = dataRows.map((row) => row[position]);
      const nonEmptyValues = columnValues.filter(
        (v) => v != null && String(v).trim() !== "",
      );
      const uniqueValues = new Set(nonEmptyValues.map(String));

      return {
        name,
        position,
        detectedType: detectCellType(nonEmptyValues),
        sampleValues: nonEmptyValues.slice(0, sampleRowCount),
        uniqueCount: uniqueValues.size,
        emptyCount: columnValues.length - nonEmptyValues.length,
      };
    });

    const sampleRows = dataRows.slice(0, sampleRowCount);

    return {
      name: sheetName,
      rowCount: dataRows.length,
      columnCount: headers.length,
      columns,
      sampleRows,
    };
  });

  return { fileName, sheets };
}

/**
 * Detect the predominant cell type from a list of non-empty values.
 */
function detectCellType(
  values: unknown[],
): "string" | "number" | "boolean" | "date" | "empty" {
  if (values.length === 0) return "empty";

  const typeCounts = { string: 0, number: 0, boolean: 0, date: 0 };

  for (const val of values) {
    if (val instanceof Date) {
      typeCounts.date++;
    } else if (typeof val === "number") {
      typeCounts.number++;
    } else if (typeof val === "boolean") {
      typeCounts.boolean++;
    } else {
      // Check if string looks like a date
      const strVal = String(val);
      if (isDateLike(strVal)) {
        typeCounts.date++;
      } else {
        typeCounts.string++;
      }
    }
  }

  // Return the most common type
  const entries = Object.entries(typeCounts) as [keyof typeof typeCounts, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,                    // 2024-01-15
  /^\d{2}\/\d{2}\/\d{4}$/,                  // 01/15/2024
  /^\d{2}-\d{2}-\d{4}$/,                    // 01-15-2024
  /^\d{4}\/\d{2}\/\d{2}$/,                  // 2024/01/15
  /^\w{3}\s+\d{1,2},?\s+\d{4}$/,            // Jan 15, 2024
  /^\d{1,2}\s+\w{3}\s+\d{4}$/,              // 15 Jan 2024
];

function isDateLike(value: string): boolean {
  return DATE_PATTERNS.some((pattern) => pattern.test(value.trim()));
}
