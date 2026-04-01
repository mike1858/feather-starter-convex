import type { InferredEntity } from "./type-inference";
import type { SheetMetadata } from "./parser";

export interface DetectedRelationship {
  sourceEntity: string;
  sourceField: string;
  targetEntity: string;
  targetField: string;      // usually "name" or the ID column
  type: "belongs_to" | "has_many";
  confidence: number;
}

export interface ClassifiedWorkbook {
  entities: InferredEntity[];
  relationships: DetectedRelationship[];
  importOrder: string[];    // topologically sorted entity names
}

/**
 * Detect relationships between entities based on:
 * 1. Column name matching: "departmentId", "department_id", "Department" matching a sheet name
 * 2. Value matching: column values match unique values in another sheet's ID/name column
 * 3. Naming conventions: columns ending in "Id", "_id", or matching a sheet name
 */
export function detectRelationships(
  entities: InferredEntity[],
  _sheets: SheetMetadata[],
): DetectedRelationship[] {
  const relationships: DetectedRelationship[] = [];

  for (const entity of entities) {
    for (const [fieldName, field] of Object.entries(entity.fields)) {
      // Pattern 1: Field name ends with "Id" or "_id"
      const baseNameMatch = fieldName.match(/^(.+?)(?:Id|_id)$/i);
      if (baseNameMatch) {
        const baseName = baseNameMatch[1].toLowerCase();
        // Check if baseName matches any entity name
        for (const targetEntity of entities) {
          if (targetEntity.name === entity.name) continue;
          const targetLower = targetEntity.name.toLowerCase().replace(/-/g, "");
          if (baseName === targetLower || baseName + "s" === targetLower || baseName === targetLower.replace(/s$/, "")) {
            relationships.push({
              sourceEntity: entity.name,
              sourceField: fieldName,
              targetEntity: targetEntity.name,
              targetField: "name",
              type: "belongs_to",
              confidence: 85,
            });
            // Mark the field as reference type
            field.type = "reference";
            field.referenceTarget = targetEntity.name;
            break;
          }
        }
      }

      // Pattern 2: Field name exactly matches a sheet name (case-insensitive)
      const fieldLower = fieldName.toLowerCase();
      for (const targetEntity of entities) {
        if (targetEntity.name === entity.name) continue;
        const targetLower = targetEntity.name.toLowerCase().replace(/-/g, "");
        const fieldMatchesTarget =
          fieldLower === targetLower ||
          fieldLower + "s" === targetLower ||
          fieldLower === targetLower.replace(/s$/, "");
        if (fieldMatchesTarget && field.type !== "reference") {
          // Check if values are low cardinality (likely foreign key)
          if (field.type === "enum" || (field.confidence < 80 && field.type === "string")) {
            relationships.push({
              sourceEntity: entity.name,
              sourceField: fieldName,
              targetEntity: targetEntity.name,
              targetField: "name",
              type: "belongs_to",
              confidence: 70,
            });
            field.type = "reference";
            field.referenceTarget = targetEntity.name;
          }
        }
      }

      // Pattern 3: Value overlap with another entity's ID/name column
      // (This requires sample data comparison — deferred to LLM-enhanced version)
    }
  }

  return relationships;
}

/**
 * Topological sort of entities based on relationships.
 * Entities with no dependencies come first (lookups),
 * then masters, then transactions.
 */
export function computeImportOrder(
  entities: InferredEntity[],
  relationships: DetectedRelationship[],
): string[] {
  const graph = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  // Initialize graph
  for (const entity of entities) {
    graph.set(entity.name, new Set());
    inDegree.set(entity.name, 0);
  }

  // Add edges: source depends on target (must import target first)
  for (const rel of relationships) {
    if (rel.type === "belongs_to") {
      graph.get(rel.sourceEntity)?.add(rel.targetEntity);
      inDegree.set(
        rel.sourceEntity,
        (inDegree.get(rel.sourceEntity) ?? 0) + 1,
      );
    }
  }

  // Kahn's algorithm for topological sort
  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) queue.push(name);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    // "current" is a dependency of entities that reference it
    // So we look for entities whose dependencies include "current"
    for (const [entity, deps] of graph) {
      if (deps.has(current)) {
        deps.delete(current);
        const newDegree = (inDegree.get(entity) ?? 1) - 1;
        inDegree.set(entity, newDegree);
        if (newDegree === 0) queue.push(entity);
      }
    }
  }

  // If there's a cycle, add remaining entities at the end
  for (const entity of entities) {
    if (!order.includes(entity.name)) {
      order.push(entity.name);
    }
  }

  return order;
}

/**
 * Classify a complete workbook: infer entities, detect relationships, compute import order.
 */
export function classifyWorkbook(
  entities: InferredEntity[],
  sheets: SheetMetadata[],
): ClassifiedWorkbook {
  const relationships = detectRelationships(entities, sheets);
  const importOrder = computeImportOrder(entities, relationships);
  return { entities, relationships, importOrder };
}
