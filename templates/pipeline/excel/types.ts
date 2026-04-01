// ── Excel Pipeline Types ─────────────────────────────────────────────────────
// Shared type definitions for the Excel-to-System pipeline.
// These types are used across parser, type-inference, entity-classifier,
// yaml-generator, and the CLI import command.

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface ParsedWorkbook {
  fileName: string;
  sheets: ParsedSheet[];
}

export interface InferredField {
  type: string;
  required: boolean;
  confidence: number;
  samples: unknown[];
}

export interface InferredEntity {
  name: string;
  label: string;
  entityType: string;
  fields: Record<string, InferredField>;
  confidence: number;
  sourceSheet: string;
}

export interface EntityRelationship {
  from: string;
  to: string;
  type: "belongs_to" | "has_many" | "many_to_many";
  foreignKey: string;
}

export interface ClassifiedWorkbook {
  entities: InferredEntity[];
  relationships: EntityRelationship[];
  importOrder: string[];
}

export interface GeneratedYaml {
  filePath: string;
  entityName: string;
  yamlContent: string;
}
