import * as yaml from "yaml";
import type { InferredEntity, InferredField } from "./type-inference";
import type { DetectedRelationship } from "./entity-classifier";

export interface YamlGeneratorInput {
  entity: InferredEntity;
  relationships: DetectedRelationship[];
}

export interface GeneratedYaml {
  entityName: string;
  yamlContent: string;
  filePath: string;        // e.g., "src/features/employees/feather.yaml"
}

/**
 * Generate a feather.yaml file from a confirmed entity schema.
 * Produces YAML that passes featureYamlSchema validation.
 */
export function generateFeatherYaml(input: YamlGeneratorInput): GeneratedYaml {
  const { entity, relationships } = input;

  const yamlObj: Record<string, unknown> = {
    name: entity.name,
    label: entity.label,
    labelPlural: entity.labelPlural,
  };

  // Fields
  const fields: Record<string, Record<string, unknown>> = {};
  for (const [fieldName, field] of Object.entries(entity.fields)) {
    fields[fieldName] = buildFieldYaml(field);
  }
  yamlObj.fields = fields;

  // Timestamps (default: both)
  yamlObj.timestamps = "both";

  // Identity (auto-increment is the default)
  yamlObj.identity = {
    type: "auto-increment",
  };

  // Access (default: authenticated)
  yamlObj.access = {
    scope: "owner",
    permissions: {
      create: "authenticated",
      read: "owner",
      update: "owner",
      delete: "owner",
    },
  };

  // Status flow (only if entity has a status-like enum field)
  const statusField = findStatusField(entity.fields);
  if (statusField && statusField.enumValues && statusField.enumValues.length > 1) {
    // Build simple linear transitions
    const transitions: Record<string, string[]> = {};
    for (let i = 0; i < statusField.enumValues.length - 1; i++) {
      transitions[statusField.enumValues[i]] = [statusField.enumValues[i + 1]];
    }
    yamlObj.statusFlow = {
      field: statusField.name,
      transitions,
    };
  }

  // Relationships (from detected relationships where this entity is the source)
  const entityRelationships = relationships.filter(
    (r) => r.sourceEntity === entity.name,
  );
  if (entityRelationships.length > 0) {
    const rels: Record<string, Record<string, unknown>> = {};
    for (const rel of entityRelationships) {
      rels[rel.targetEntity] = {
        type: rel.type,
        target: rel.targetEntity,
        ...(rel.type === "belongs_to"
          ? { required: false, column: rel.sourceField }
          : { foreignKey: rel.sourceField }),
      };
    }
    yamlObj.relationships = rels;
  }

  // Operations
  yamlObj.operations = {
    create: true,
    read: true,
    update: true,
    delete: true,
  };

  // Behaviors
  yamlObj.behaviors = {
    assignable: false,
    orderable: false,
    softDelete: false,
    auditTrail: entity.entityType === "transaction",
  };

  // Views
  yamlObj.views = {
    defaultView: "list",
    enabledViews: ["list"],
  };

  // Search (enable for entities with string fields)
  const searchableFields = Object.entries(entity.fields)
    .filter(([_, f]) => f.type === "string" || f.type === "text")
    .map(([name]) => name);
  if (searchableFields.length > 0) {
    yamlObj.search = true;
    yamlObj.searchFields = searchableFields.slice(0, 3); // max 3 search fields
  }

  const yamlContent = yaml.stringify(yamlObj, {
    indent: 2,
    lineWidth: 0,    // no line wrapping
  });

  return {
    entityName: entity.name,
    yamlContent,
    filePath: `src/features/${entity.name}/feather.yaml`,
  };
}

/**
 * Generate feather.yaml files for all entities in a workbook.
 */
export function generateAllYamls(
  entities: InferredEntity[],
  relationships: DetectedRelationship[],
): GeneratedYaml[] {
  return entities.map((entity) =>
    generateFeatherYaml({ entity, relationships }),
  );
}

function buildFieldYaml(field: InferredField): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    type: field.type,
    required: field.required,
  };

  if (field.enumValues && field.enumValues.length > 0) {
    obj.values = field.enumValues;
  }

  if (field.referenceTarget) {
    obj.target = field.referenceTarget;
  }

  if (field.max) {
    obj.max = field.max;
  }

  return obj;
}

function findStatusField(
  fields: Record<string, InferredField>,
): InferredField | null {
  // Look for enum fields with status-like names
  const statusNames = ["status", "state", "stage", "phase"];
  for (const [name, field] of Object.entries(fields)) {
    if (field.type === "enum" && statusNames.includes(name.toLowerCase())) {
      return field;
    }
  }
  return null;
}
