import { useMutation } from "convex/react";
import { api } from "~/convex/_generated/api";
import { useState, useCallback } from "react";
import { parseExcelWorkbook } from "~/templates/pipeline/excel/parser";
import type { SheetMetadata } from "~/templates/pipeline/excel/parser";
import { inferEntities } from "~/templates/pipeline/excel/type-inference";
import type {
  InferredEntity,
  DetectedRelationship,
} from "../types";

/**
 * Detect relationships between entities by scanning for reference-type fields
 * and name-matching patterns (e.g., "customerId" references "customers" entity).
 */
function detectRelationships(
  entities: InferredEntity[],
): DetectedRelationship[] {
  const relationships: DetectedRelationship[] = [];
  const entityNames = new Set(entities.map((e) => e.name));

  for (const entity of entities) {
    for (const [fieldName, field] of Object.entries(entity.fields)) {
      if (field.type !== "reference") continue;

      // Try to match field name to an entity (e.g., "customerId" -> "customers")
      const baseName = fieldName.replace(/Id$/, "").toLowerCase();
      for (const targetName of entityNames) {
        if (targetName === entity.name) continue;
        if (
          targetName.toLowerCase().startsWith(baseName) ||
          baseName.startsWith(targetName.toLowerCase())
        ) {
          relationships.push({
            sourceEntity: entity.name,
            targetEntity: targetName,
            sourceField: fieldName,
            confidence: 70,
            type: "belongs_to",
          });
          break;
        }
      }
    }
  }

  return relationships;
}

/**
 * Determine import order based on relationships (referenced entities first).
 */
function computeImportOrder(
  entities: InferredEntity[],
  relationships: DetectedRelationship[],
): string[] {
  const targetEntities = new Set(relationships.map((r) => r.targetEntity));
  const sourceOnly = entities
    .filter(
      (e) =>
        !targetEntities.has(e.name) &&
        relationships.some((r) => r.sourceEntity === e.name),
    )
    .map((e) => e.name);
  const targets = entities
    .filter((e) => targetEntities.has(e.name))
    .map((e) => e.name);
  const standalone = entities
    .filter(
      (e) =>
        !targetEntities.has(e.name) &&
        !relationships.some((r) => r.sourceEntity === e.name),
    )
    .map((e) => e.name);

  // targets first (they are referenced), then standalone, then source-only
  return [...targets, ...standalone, ...sourceOnly];
}

export function useSchemaAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createImport = useMutation(api.imports.mutations.create);

  const analyzeFile = useCallback(
    async (file: File) => {
      setIsAnalyzing(true);
      setError(null);

      try {
        // 1. Parse client-side for quick preview
        const arrayBuffer = await file.arrayBuffer();
        const parsed = parseExcelWorkbook(arrayBuffer, file.name);

        // 2. Quick heuristic analysis (instant, client-side)
        const entities = inferEntities(parsed.sheets);

        // 3. Detect relationships from reference fields
        const relationships = detectRelationships(entities);
        const importOrder = computeImportOrder(entities, relationships);

        // 4. Create import record
        const importId = await createImport({
          fileName: file.name,
          sheetMetadata: JSON.stringify(
            parsed.sheets.map((s: SheetMetadata) => ({
              name: s.name,
              rowCount: s.rowCount,
              columnCount: s.columnCount,
            })),
          ),
        });

        // Return heuristic results immediately for fast UX
        return {
          entities,
          relationships,
          importOrder,
          method: "heuristic" as const,
          importId: importId as string,
          sheets: parsed.sheets,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Analysis failed";
        setError(message);
        throw err;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [createImport],
  );

  return { analyzeFile, isAnalyzing, error };
}
