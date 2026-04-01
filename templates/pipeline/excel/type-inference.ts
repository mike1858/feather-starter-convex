import type { ColumnInfo, SheetMetadata } from "./parser";
import type { FieldType } from "../../schema/field.schema";

export interface InferredField {
  name: string;
  type: FieldType;
  required: boolean;
  confidence: number;       // 0-100
  enumValues?: string[];    // populated when type is "enum"
  referenceTarget?: string; // populated when type is "reference"
  max?: number;             // for string/text fields
}

export interface InferredEntity {
  name: string;
  label: string;
  labelPlural: string;
  entityType: "lookup" | "master" | "transaction" | "reference" | "unknown";
  confidence: number;
  fields: Record<string, InferredField>;
  sourceSheet: string;
}

// ── Pattern matchers ────────────────────────────────────────────────────────

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^https?:\/\/.+/;
const CURRENCY_PATTERN = /^[$€£¥₹]\s*[\d,.]+$|^[\d,.]+\s*[$€£¥₹]$/;
const PERCENTAGE_PATTERN = /^[\d.]+\s*%$/;

/**
 * Infer feather.yaml field types from parsed Excel column data.
 * Uses heuristics only (no LLM). Covers ~70-80% of cases.
 */
export function inferFieldType(column: ColumnInfo): InferredField {
  const { name, detectedType, sampleValues, uniqueCount, emptyCount } = column;
  const totalValues = sampleValues.length + emptyCount;
  const required = emptyCount === 0 && totalValues > 0;
  const fieldName = toFieldName(name);

  // Check string patterns first (email, url, currency, percentage)
  if (detectedType === "string" && sampleValues.length > 0) {
    const strValues = sampleValues.map(String);

    // Email
    const emailMatches = strValues.filter((v) => EMAIL_PATTERN.test(v)).length;
    if (emailMatches / strValues.length > 0.8) {
      return { name: fieldName, type: "email", required, confidence: 90 };
    }

    // URL
    const urlMatches = strValues.filter((v) => URL_PATTERN.test(v)).length;
    if (urlMatches / strValues.length > 0.8) {
      return { name: fieldName, type: "url", required, confidence: 90 };
    }

    // Currency
    const currencyMatches = strValues.filter((v) => CURRENCY_PATTERN.test(v)).length;
    if (currencyMatches / strValues.length > 0.8) {
      return { name: fieldName, type: "currency", required, confidence: 85 };
    }

    // Percentage
    const percentMatches = strValues.filter((v) => PERCENTAGE_PATTERN.test(v)).length;
    if (percentMatches / strValues.length > 0.8) {
      return { name: fieldName, type: "percentage", required, confidence: 85 };
    }

    // Enum: low cardinality (< 20 unique, or < 30% of total rows)
    if (uniqueCount <= 20 || (totalValues > 10 && uniqueCount / totalValues < 0.3)) {
      return {
        name: fieldName,
        type: "enum",
        required,
        confidence: 80,
        enumValues: [...new Set(strValues)],
      };
    }

    // Text: long strings (average > 100 chars)
    const avgLength = strValues.reduce((sum, v) => sum + v.length, 0) / strValues.length;
    if (avgLength > 100) {
      return { name: fieldName, type: "text", required, confidence: 85, max: 5000 };
    }

    // Default string
    const maxLen = Math.max(...strValues.map((v) => v.length));
    return { name: fieldName, type: "string", required, confidence: 75, max: Math.min(maxLen * 2, 500) };
  }

  // Number
  if (detectedType === "number") {
    // Check if values look like currency (whole numbers or 2 decimal places)
    const nameHint = name.toLowerCase();
    if (nameHint.includes("price") || nameHint.includes("cost") || nameHint.includes("salary") ||
        nameHint.includes("amount") || nameHint.includes("total") || nameHint.includes("fee")) {
      return { name: fieldName, type: "currency", required, confidence: 80 };
    }
    if (nameHint.includes("percent") || nameHint.includes("rate") || nameHint.includes("ratio")) {
      return { name: fieldName, type: "percentage", required, confidence: 80 };
    }
    return { name: fieldName, type: "number", required, confidence: 90 };
  }

  // Boolean
  if (detectedType === "boolean") {
    return { name: fieldName, type: "boolean", required, confidence: 95 };
  }

  // Date
  if (detectedType === "date") {
    return { name: fieldName, type: "date", required, confidence: 90 };
  }

  // Fallback
  return { name: fieldName, type: "string", required, confidence: 50 };
}

/**
 * Infer entity type from field composition.
 */
export function inferEntityType(
  fields: Record<string, InferredField>,
): { entityType: InferredEntity["entityType"]; confidence: number } {
  const fieldList = Object.values(fields);
  const fieldTypes = fieldList.map((f) => f.type);
  const fieldNames = Object.keys(fields).map((n) => n.toLowerCase());

  const hasDate = fieldTypes.includes("date");
  const hasCurrency = fieldTypes.includes("currency");
  const hasReference = fieldTypes.includes("reference");
  const enumCount = fieldTypes.filter((t) => t === "enum").length;
  const totalFields = fieldList.length;

  // Transaction: has dates + amounts + references
  if (hasDate && (hasCurrency || hasReference)) {
    return { entityType: "transaction", confidence: 85 };
  }

  // Lookup: mostly enums, few fields (< 5), or all short strings
  if (totalFields <= 4 && enumCount / totalFields > 0.3) {
    return { entityType: "lookup", confidence: 80 };
  }

  // Master: has email/name-like fields, person/org pattern
  const hasEmail = fieldTypes.includes("email");
  const hasNameField = fieldNames.some((n) =>
    n.includes("name") || n.includes("first") || n.includes("last"),
  );
  if (hasEmail || hasNameField) {
    return { entityType: "master", confidence: 75 };
  }

  // Reference: has name + description pattern (products, categories)
  const hasDescription = fieldNames.some((n) =>
    n.includes("description") || n.includes("desc") || n.includes("notes"),
  );
  if (hasNameField && hasDescription) {
    return { entityType: "reference", confidence: 70 };
  }

  return { entityType: "unknown", confidence: 50 };
}

/**
 * Infer complete entities from a parsed workbook.
 * Each sheet becomes one entity (or multiple via LLM in Plan 02).
 */
export function inferEntities(sheets: SheetMetadata[]): InferredEntity[] {
  return sheets
    .filter((sheet) => sheet.rowCount > 0 && sheet.columns.length > 0)
    .map((sheet) => {
      const fields: Record<string, InferredField> = {};
      for (const column of sheet.columns) {
        if (column.name.trim() === "") continue;
        const inferred = inferFieldType(column);
        fields[inferred.name] = inferred;
      }

      const { entityType, confidence } = inferEntityType(fields);
      const name = toEntityName(sheet.name);

      return {
        name,
        label: toLabel(sheet.name),
        labelPlural: toLabel(sheet.name) + "s",
        entityType,
        confidence,
        fields,
        sourceSheet: sheet.name,
      };
    });
}

// ── String utilities ────────────────────────────────────────────────────────

function toFieldName(columnHeader: string): string {
  return columnHeader
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toLowerCase());
}

function toEntityName(sheetName: string): string {
  return sheetName
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function toLabel(sheetName: string): string {
  return sheetName.trim().replace(/([a-z])([A-Z])/g, "$1 $2");
}
