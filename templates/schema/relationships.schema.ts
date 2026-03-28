import { z } from "zod";
import { fieldsMapSchema } from "./field.schema";

// ── Belongs-to (loose association) ───────────────────────────────────────────

const belongsToSchema = z.object({
  type: z.literal("belongs_to"),
  target: z.string(),
  required: z.boolean().default(false),
  column: z.string(),
  fetchFrom: z.array(z.string()).optional(),
});

// ── Has-many (reverse lookup) ────────────────────────────────────────────────

const hasManySchema = z.object({
  type: z.literal("has_many"),
  target: z.string(),
  foreignKey: z.string(),
});

// ── Union of relationship types ──────────────────────────────────────────────

export const relationshipSchema = z.discriminatedUnion("type", [
  belongsToSchema,
  hasManySchema,
]);

export type Relationship = z.infer<typeof relationshipSchema>;

// ── Children (tight parent-child — inline entity definition) ─────────────────

export const childEntitySchema = z.object({
  label: z.string(),
  labelPlural: z.string().optional(),
  fields: fieldsMapSchema,
  orderable: z.boolean().default(false),
  softDelete: z.boolean().default(false),
});

export type ChildEntity = z.infer<typeof childEntitySchema>;
