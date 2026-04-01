// ── Type Inference ───────────────────────────────────────────────────────────
// Infers entity schemas from parsed Excel sheet data.
// Full implementation in Plan 999.5-01.

import type { ParsedSheet, InferredEntity, InferredField } from "./types";

/**
 * Infer field types from column data samples.
 */
function inferFieldType(values: unknown[]): { type: string; confidence: number } {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (nonNull.length === 0) return { type: "string", confidence: 50 };

  const sample = nonNull.slice(0, 100);
  const allNumbers = sample.every((v) => typeof v === "number" || !isNaN(Number(v)));
  if (allNumbers) return { type: "number", confidence: 90 };

  const allBooleans = sample.every(
    (v) => typeof v === "boolean" || v === "true" || v === "false" || v === "yes" || v === "no",
  );
  if (allBooleans) return { type: "boolean", confidence: 85 };

  const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{2,4}/;
  const allDates = sample.every((v) => typeof v === "string" && datePattern.test(v));
  if (allDates) return { type: "date", confidence: 80 };

  return { type: "string", confidence: 95 };
}

/**
 * Convert a sheet name to a valid entity name (kebab-case).
 */
function toEntityName(sheetName: string): string {
  return sheetName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Infer entities from parsed sheet data.
 */
export function inferEntities(sheets: ParsedSheet[]): InferredEntity[] {
  return sheets.map((sheet) => {
    const fields: Record<string, InferredField> = {};

    for (const header of sheet.headers) {
      const columnValues = sheet.rows.map((row) => row[header]);
      const nonNullCount = columnValues.filter((v) => v !== null && v !== undefined && v !== "").length;
      const required = nonNullCount / Math.max(sheet.rowCount, 1) > 0.8;
      const { type, confidence } = inferFieldType(columnValues);

      fields[header] = {
        type,
        required,
        confidence,
        samples: columnValues.slice(0, 5),
      };
    }

    return {
      name: toEntityName(sheet.name),
      label: sheet.name,
      entityType: "document",
      fields,
      confidence: 80,
      sourceSheet: sheet.name,
    };
  });
}
