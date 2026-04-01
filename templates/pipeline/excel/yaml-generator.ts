// ── YAML Generator ───────────────────────────────────────────────────────────
// Generates feather.yaml files from inferred entities.
// Full implementation in Plan 999.5-02.

import type { InferredEntity, EntityRelationship, GeneratedYaml } from "./types";

/**
 * Map inferred types to feather.yaml field types.
 */
function mapFieldType(inferredType: string): string {
  switch (inferredType) {
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "date":
      return "date";
    default:
      return "string";
  }
}

/**
 * Convert entity name to PascalCase label.
 */
function toLabel(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Generate feather.yaml content for a single entity.
 */
function generateEntityYaml(
  entity: InferredEntity,
  relationships: EntityRelationship[],
): string {
  const lines: string[] = [];
  lines.push(`name: ${entity.name}`);
  lines.push(`label: ${toLabel(entity.name)}`);
  lines.push("fields:");

  for (const [fieldName, field] of Object.entries(entity.fields)) {
    lines.push(`  ${fieldName}:`);
    lines.push(`    type: ${mapFieldType(field.type)}`);
    if (field.required) {
      lines.push("    required: true");
    }
  }

  // Add relationship references
  const entityRels = relationships.filter(
    (r) => r.from === entity.name || r.to === entity.name,
  );
  if (entityRels.length > 0) {
    lines.push("relationships:");
    for (const rel of entityRels) {
      if (rel.from === entity.name) {
        lines.push(`  ${rel.to}:`);
        lines.push(`    type: ${rel.type}`);
        lines.push(`    foreignKey: ${rel.foreignKey}`);
      }
    }
  }

  return lines.join("\n") + "\n";
}

/**
 * Generate all feather.yaml files for classified entities.
 */
export function generateAllYamls(
  entities: InferredEntity[],
  relationships: EntityRelationship[],
): GeneratedYaml[] {
  return entities.map((entity) => ({
    filePath: `src/features/${entity.name}/feather.yaml`,
    entityName: entity.name,
    yamlContent: generateEntityYaml(entity, relationships),
  }));
}
