// ── Entity Classifier ────────────────────────────────────────────────────────
// Classifies entities and detects relationships between them.
// Full implementation in Plan 999.5-02.

import type {
  InferredEntity,
  ParsedSheet,
  ClassifiedWorkbook,
  EntityRelationship,
} from "./types";

/**
 * Detect foreign key relationships between entities based on field naming patterns.
 */
function detectRelationships(entities: InferredEntity[]): EntityRelationship[] {
  const relationships: EntityRelationship[] = [];
  const entityNames = new Set(entities.map((e) => e.name));

  for (const entity of entities) {
    for (const fieldName of Object.keys(entity.fields)) {
      const normalized = fieldName.toLowerCase().replace(/[-_\s]/g, "");

      // Check for foreign key patterns: entityName_id, entityNameId, entity_name_id
      for (const targetName of entityNames) {
        if (targetName === entity.name) continue;
        const targetNormalized = targetName.toLowerCase().replace(/[-_\s]/g, "");

        if (
          normalized === `${targetNormalized}id` ||
          normalized === `${targetNormalized}_id`
        ) {
          relationships.push({
            from: entity.name,
            to: targetName,
            type: "belongs_to",
            foreignKey: fieldName,
          });
        }
      }
    }
  }

  return relationships;
}

/**
 * Determine import order based on relationships (dependencies first).
 */
function determineImportOrder(
  entities: InferredEntity[],
  relationships: EntityRelationship[],
): string[] {
  const deps = new Map<string, Set<string>>();
  for (const entity of entities) {
    deps.set(entity.name, new Set());
  }
  for (const rel of relationships) {
    deps.get(rel.from)?.add(rel.to);
  }

  const sorted: string[] = [];
  const visited = new Set<string>();

  function visit(name: string): void {
    if (visited.has(name)) return;
    visited.add(name);
    for (const dep of deps.get(name) ?? []) {
      visit(dep);
    }
    sorted.push(name);
  }

  for (const entity of entities) {
    visit(entity.name);
  }

  return sorted;
}

/**
 * Classify a workbook's entities and detect relationships.
 */
export function classifyWorkbook(
  entities: InferredEntity[],
  _sheets: ParsedSheet[],
): ClassifiedWorkbook {
  const relationships = detectRelationships(entities);
  const importOrder = determineImportOrder(entities, relationships);

  return {
    entities,
    relationships,
    importOrder,
  };
}
