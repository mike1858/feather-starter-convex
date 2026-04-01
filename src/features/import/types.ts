import type { InferredEntity } from "~/templates/pipeline/excel/type-inference";

/**
 * A detected relationship between two entities.
 * Defined here since entity-classifier module is not yet built (Plan 02 scope).
 */
export interface DetectedRelationship {
  sourceEntity: string;
  targetEntity: string;
  sourceField: string;
  confidence: number;
  type: "belongs_to" | "has_many" | "many_to_many";
}

export type { InferredEntity };
