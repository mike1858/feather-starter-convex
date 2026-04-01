import type { InferredField } from "./type-inference";

export type ErrorSeverity = "green" | "yellow" | "red";

export interface ImportError {
  entityName: string;
  rowNumber: number;
  severity: ErrorSeverity;
  column: string;
  originalValue: string | null;
  fixedValue: string | null;
  errorMessage: string;
}

export interface ImportRowResult {
  rowNumber: number;
  success: boolean;
  data: Record<string, unknown>;
  errors: ImportError[];
}

export interface EntityImportResult {
  entityName: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: ImportError[];
}

/**
 * Coerce a single value to match the expected field type.
 * Returns the coerced value and any errors encountered.
 *
 * Error tiers (D-14):
 * - green: auto-fixed (string "50000" -> number, currency symbol removal, case correction)
 * - yellow: needs review (ambiguous boolean, unrecognized enum)
 * - red: unfixable (invalid number, empty required, invalid email, unparseable date)
 */
export function coerceValue(
  value: unknown,
  field: InferredField,
  entityName: string,
  rowNumber: number,
): { value: unknown; errors: ImportError[] } {
  const errors: ImportError[] = [];
  const strVal = value != null ? String(value).trim() : "";

  // Null/empty handling
  if (strVal === "" || value == null) {
    if (field.required) {
      errors.push({
        entityName,
        rowNumber,
        severity: "red",
        column: field.name,
        originalValue: null,
        fixedValue: null,
        errorMessage: `Required field "${field.name}" is empty`,
      });
      return { value: null, errors };
    }
    return { value: null, errors };
  }

  switch (field.type) {
    case "number":
    case "currency":
    case "percentage": {
      // Green: string that looks like a number — strip currency/percent symbols
      const cleaned = strVal.replace(/[$€£¥₹,%\s]/g, "");
      const num = Number(cleaned);
      if (isNaN(num)) {
        errors.push({
          entityName,
          rowNumber,
          severity: "red",
          column: field.name,
          originalValue: strVal,
          fixedValue: null,
          errorMessage: `Cannot convert "${strVal}" to number`,
        });
        return { value: null, errors };
      }
      if (cleaned !== strVal) {
        errors.push({
          entityName,
          rowNumber,
          severity: "green",
          column: field.name,
          originalValue: strVal,
          fixedValue: String(num),
          errorMessage: `Auto-converted "${strVal}" to ${num}`,
        });
      }
      return { value: num, errors };
    }

    case "boolean": {
      const lower = strVal.toLowerCase();
      const trueValues = ["true", "yes", "1", "y", "on"];
      const falseValues = ["false", "no", "0", "n", "off"];
      if (trueValues.includes(lower)) return { value: true, errors };
      if (falseValues.includes(lower)) return { value: false, errors };
      errors.push({
        entityName,
        rowNumber,
        severity: "yellow",
        column: field.name,
        originalValue: strVal,
        fixedValue: "false",
        errorMessage: `Ambiguous boolean value "${strVal}" — defaulting to false`,
      });
      return { value: false, errors };
    }

    case "date": {
      if (value instanceof Date) return { value: value.toISOString(), errors };
      const date = new Date(strVal);
      if (isNaN(date.getTime())) {
        errors.push({
          entityName,
          rowNumber,
          severity: "red",
          column: field.name,
          originalValue: strVal,
          fixedValue: null,
          errorMessage: `Cannot parse "${strVal}" as a date`,
        });
        return { value: null, errors };
      }
      if (strVal !== date.toISOString()) {
        errors.push({
          entityName,
          rowNumber,
          severity: "green",
          column: field.name,
          originalValue: strVal,
          fixedValue: date.toISOString(),
          errorMessage: `Auto-converted "${strVal}" to ISO date`,
        });
      }
      return { value: date.toISOString(), errors };
    }

    case "enum": {
      if (field.enumValues && !field.enumValues.includes(strVal)) {
        // Try case-insensitive match
        const match = field.enumValues.find(
          (v) => v.toLowerCase() === strVal.toLowerCase(),
        );
        if (match) {
          errors.push({
            entityName,
            rowNumber,
            severity: "green",
            column: field.name,
            originalValue: strVal,
            fixedValue: match,
            errorMessage: `Case-corrected "${strVal}" to "${match}"`,
          });
          return { value: match, errors };
        }
        // No match — yellow: needs review
        errors.push({
          entityName,
          rowNumber,
          severity: "yellow",
          column: field.name,
          originalValue: strVal,
          fixedValue: null,
          errorMessage: `"${strVal}" is not a valid value for ${field.name}. Valid: ${field.enumValues.join(", ")}`,
        });
        return { value: null, errors };
      }
      return { value: strVal, errors };
    }

    case "email": {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(strVal)) {
        errors.push({
          entityName,
          rowNumber,
          severity: "red",
          column: field.name,
          originalValue: strVal,
          fixedValue: null,
          errorMessage: `"${strVal}" is not a valid email address`,
        });
        return { value: null, errors };
      }
      return { value: strVal.toLowerCase(), errors };
    }

    case "url": {
      if (!strVal.startsWith("http://") && !strVal.startsWith("https://")) {
        const fixed = `https://${strVal}`;
        errors.push({
          entityName,
          rowNumber,
          severity: "green",
          column: field.name,
          originalValue: strVal,
          fixedValue: fixed,
          errorMessage: `Auto-prepended https:// to "${strVal}"`,
        });
        return { value: fixed, errors };
      }
      return { value: strVal, errors };
    }

    default:
      // string, text, reference — pass through
      return { value: strVal, errors };
  }
}

/**
 * Process a single row against the entity schema.
 * Returns the coerced data and all errors.
 */
export function processRow(
  row: unknown[],
  columns: string[],
  fields: Record<string, InferredField>,
  entityName: string,
  rowNumber: number,
): ImportRowResult {
  const data: Record<string, unknown> = {};
  const errors: ImportError[] = [];

  for (let i = 0; i < columns.length; i++) {
    const columnName = columns[i];
    // Find matching field (column header -> camelCase field name)
    const field = Object.values(fields).find(
      (f) => f.name === columnName || f.name === toCamelCase(columnName),
    );
    if (!field) continue;

    const result = coerceValue(row[i], field, entityName, rowNumber);
    data[field.name] = result.value;
    errors.push(...result.errors);
  }

  const hasRedErrors = errors.some((e) => e.severity === "red");
  return {
    rowNumber,
    success: !hasRedErrors,
    data,
    errors,
  };
}

function toCamelCase(str: string): string {
  return str
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toLowerCase());
}
