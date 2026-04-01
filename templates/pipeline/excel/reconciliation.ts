import { computeColumnMatchScore, type ColumnMatchScore } from "./jaro-winkler";
import type { ColumnInfo, SheetMetadata } from "./parser";

export type ChangeType = "rename" | "add" | "remove" | "type_change";

export interface SchemaChange {
  type: ChangeType;
  entityName: string;
  // For rename:
  oldColumnName?: string;
  newColumnName?: string;
  matchScore?: ColumnMatchScore;
  // For add:
  addedColumn?: ColumnInfo;
  // For remove:
  removedColumn?: string;
  removedColumnDataCount?: number; // how many rows have data in this column
  // For type_change:
  column?: string;
  oldType?: string;
  newType?: string;
  // User action (set during confirmation)
  action?: "accept" | "reject" | "archive" | "delete" | "keep_hidden";
}

export interface ReconciliationResult {
  isReimport: boolean;
  overallSimilarity: number;
  matchedEntity: string | null;
  changes: SchemaChange[];
}

export interface StoredMapping {
  systemFieldId: string;
  systemFieldName: string;
  excelColumnName: string;
  excelColumnPosition: number;
  excelSheetName: string;
  dataFingerprint?: string;
}

/**
 * Compare a new sheet against stored mappings to detect schema changes.
 * Returns reconciliation result with change list.
 *
 * Three-phase reconciliation (D-09, D-10):
 * 1. Exact match columns
 * 2. Fuzzy match remaining (renames) using Jaro-Winkler scoring
 * 3. Classify unmatched as additions or removals
 */
export function reconcileSheet(
  newSheet: SheetMetadata,
  storedMappings: StoredMapping[],
  entityName: string,
): ReconciliationResult {
  const changes: SchemaChange[] = [];
  const storedColumnNames = new Set(
    storedMappings.map((m) => m.excelColumnName),
  );
  const matchedNew = new Set<string>();
  const matchedStored = new Set<string>();

  // 1. Exact matches
  for (const newCol of newSheet.columns) {
    if (storedColumnNames.has(newCol.name)) {
      matchedNew.add(newCol.name);
      matchedStored.add(newCol.name);
    }
  }

  // 2. Fuzzy match unmapped columns (potential renames)
  const unmatchedNew = newSheet.columns.filter(
    (c) => !matchedNew.has(c.name),
  );
  const unmatchedStored = storedMappings.filter(
    (m) => !matchedStored.has(m.excelColumnName),
  );

  const renameCandidates: Array<{
    stored: StoredMapping;
    newCol: ColumnInfo;
    score: ColumnMatchScore;
  }> = [];

  for (const stored of unmatchedStored) {
    for (const newCol of unmatchedNew) {
      // Parse stored data fingerprint if available (JSON array of sample values)
      const storedValues = parseDataFingerprint(stored.dataFingerprint);
      const score = computeColumnMatchScore(
        stored.excelColumnName,
        newCol.name,
        stored.excelColumnPosition,
        newCol.position,
        Math.max(newSheet.columns.length, storedMappings.length),
        storedValues,
        newCol.sampleValues,
      );

      if (score.isPossibleRename) {
        renameCandidates.push({ stored, newCol, score });
      }
    }
  }

  // Greedy best-match for renames (resolve conflicts by highest score)
  renameCandidates.sort((a, b) => b.score.score - a.score.score);
  const usedNew = new Set<string>();
  const usedStored = new Set<string>();

  for (const candidate of renameCandidates) {
    if (
      usedNew.has(candidate.newCol.name) ||
      usedStored.has(candidate.stored.excelColumnName)
    ) {
      continue;
    }
    changes.push({
      type: "rename",
      entityName,
      oldColumnName: candidate.stored.excelColumnName,
      newColumnName: candidate.newCol.name,
      matchScore: candidate.score,
    });
    usedNew.add(candidate.newCol.name);
    usedStored.add(candidate.stored.excelColumnName);
    matchedNew.add(candidate.newCol.name);
    matchedStored.add(candidate.stored.excelColumnName);
  }

  // 3. Remaining unmatched new columns = additions
  for (const newCol of unmatchedNew) {
    if (!matchedNew.has(newCol.name)) {
      changes.push({
        type: "add",
        entityName,
        addedColumn: newCol,
      });
    }
  }

  // 4. Remaining unmatched stored columns = removals
  for (const stored of unmatchedStored) {
    if (!matchedStored.has(stored.excelColumnName)) {
      changes.push({
        type: "remove",
        entityName,
        removedColumn: stored.excelColumnName,
        removedColumnDataCount: 0, // populated from system data in production
      });
    }
  }

  // Overall similarity
  const totalColumns = Math.max(
    newSheet.columns.length,
    storedMappings.length,
  );
  const exactMatches = [...matchedNew].filter(
    (n) => !changes.some((c) => c.type === "rename" && c.newColumnName === n),
  ).length;
  const overallSimilarity =
    totalColumns > 0 ? exactMatches / totalColumns : 0;

  const isReimport =
    overallSimilarity > 0.5 || changes.some((c) => c.type === "rename");

  return {
    isReimport,
    overallSimilarity,
    matchedEntity: isReimport ? entityName : null,
    changes,
  };
}

/**
 * Auto-detect if a new upload is a re-import of an existing entity.
 * Compares sheet names and column patterns against all stored mappings.
 * Returns a map of sheet name -> best matching reconciliation result.
 */
export function detectReimport(
  newSheets: SheetMetadata[],
  allStoredMappings: Map<string, StoredMapping[]>, // entityName -> mappings
): Map<string, ReconciliationResult> {
  const results = new Map<string, ReconciliationResult>();

  for (const sheet of newSheets) {
    let bestMatch: {
      entityName: string;
      result: ReconciliationResult;
    } | null = null;

    for (const [entityName, mappings] of allStoredMappings) {
      const result = reconcileSheet(sheet, mappings, entityName);
      if (result.isReimport) {
        if (
          !bestMatch ||
          result.overallSimilarity > bestMatch.result.overallSimilarity
        ) {
          bestMatch = { entityName, result };
        }
      }
    }

    if (bestMatch) {
      results.set(sheet.name, bestMatch.result);
    }
  }

  return results;
}

/**
 * Parse a stored data fingerprint string into sample values.
 * Fingerprints are stored as JSON arrays. Returns empty array on failure.
 */
function parseDataFingerprint(fingerprint: string | undefined): unknown[] {
  if (!fingerprint) return [];
  try {
    const parsed = JSON.parse(fingerprint);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
