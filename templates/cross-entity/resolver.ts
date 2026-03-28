import type { FeatureYaml } from "../schema/feather-yaml.schema";

// ── Resolved types for template rendering ────────────────────────────────────

export interface ResolvedRelatedRecord {
  source: string;
  sourcePascal: string;
  sourcePlural: string;
  display: "table" | "checklist" | "timeline" | "cards";
  inline: boolean;
  readonly: boolean;
  columns: string[];
  foreignKey: string;
  queryName: string;
  mutationNames: {
    create?: string;
    update?: string;
    remove?: string;
  };
}

export interface DetailPageContext {
  parentEntity: string;
  parentLabel: string;
  layout: "tabs" | "panels" | "accordion";
  relatedRecords: ResolvedRelatedRecord[];
  hasInlineEditing: boolean;
}

// ── Helper functions ─────────────────────────────────────────────────────────

function toPascalCase(str: string): string {
  return str
    .replace(/[-_](\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase());
}

function toPlural(str: string): string {
  const pascal = toPascalCase(str);
  // Simple pluralization — handles common patterns
  if (pascal.endsWith("s")) return pascal;
  if (pascal.endsWith("y") && !pascal.endsWith("ay") && !pascal.endsWith("ey")) {
    return pascal.slice(0, -1) + "ies";
  }
  return pascal + "s";
}

function resolveColumns(
  sourceYaml: FeatureYaml | undefined,
  explicitColumns: string[] | undefined,
): string[] {
  if (explicitColumns && explicitColumns.length > 0) {
    return explicitColumns;
  }

  if (!sourceYaml) return [];

  // Take first 4 fields from the source entity
  const allFields = Object.keys(sourceYaml.fields);
  return allFields.slice(0, 4);
}

function resolveForeignKey(
  parentName: string,
  sourceYaml: FeatureYaml | undefined,
): string {
  if (!sourceYaml?.relationships) {
    return `${parentName}Id`;
  }

  // Find a belongs_to relationship targeting the parent
  for (const [, rel] of Object.entries(sourceYaml.relationships)) {
    if (rel.type === "belongs_to" && rel.target === parentName + "s") {
      return rel.column;
    }
  }

  // Also try direct match (parent name as-is, which might already be plural)
  for (const [, rel] of Object.entries(sourceYaml.relationships)) {
    if (rel.type === "belongs_to" && rel.target === parentName) {
      return rel.column;
    }
  }

  return `${parentName}Id`;
}

// ── Main resolver ────────────────────────────────────────────────────────────

export function resolveDetailPage(
  parentYaml: FeatureYaml,
  relatedYamls: Map<string, FeatureYaml>,
): DetailPageContext {
  if (!parentYaml.detailView) {
    return {
      parentEntity: parentYaml.name,
      parentLabel: parentYaml.label,
      layout: "panels",
      relatedRecords: [],
      hasInlineEditing: false,
    };
  }

  const layout = parentYaml.detailView.layout ?? "panels";
  const relatedRecords: ResolvedRelatedRecord[] = [];

  for (const record of parentYaml.detailView.relatedRecords) {
    const sourceYaml = relatedYamls.get(record.source);

    if (!sourceYaml && !relatedYamls.has(record.source)) {
      // Source entity YAML not provided — use defaults
    }

    const sourcePascal = toPascalCase(record.source);
    const parentPascal = toPascalCase(parentYaml.name);

    const resolved: ResolvedRelatedRecord = {
      source: record.source,
      sourcePascal,
      sourcePlural: toPlural(record.source),
      display: record.display,
      inline: record.inline ?? false,
      readonly: record.readonly ?? false,
      columns: resolveColumns(sourceYaml, record.columns),
      foreignKey: resolveForeignKey(parentYaml.name, sourceYaml),
      queryName: `${record.source}.queries.listBy${parentPascal}`,
      mutationNames:
        record.inline && !record.readonly
          ? {
              create: `${record.source}.mutations.create`,
              update: `${record.source}.mutations.update`,
              remove: `${record.source}.mutations.remove`,
            }
          : {},
    };

    relatedRecords.push(resolved);
  }

  return {
    parentEntity: parentYaml.name,
    parentLabel: parentYaml.label,
    layout,
    relatedRecords,
    hasInlineEditing: relatedRecords.some((r) => r.inline && !r.readonly),
  };
}
