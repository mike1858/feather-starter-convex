import { z } from "zod";

// ── Field Types ──────────────────────────────────────────────────────────────

export const fieldTypeSchema = z.enum([
  "string",
  "text",
  "number",
  "boolean",
  "enum",
  "date",
  "reference",
  "email",
  "url",
  "currency",
  "percentage",
]);
export type FieldType = z.infer<typeof fieldTypeSchema>;

// ── Enum-specific schemas ────────────────────────────────────────────────────

const enumTransitionsSchema = z.record(z.string(), z.array(z.string()));
const enumTransitionGuardsSchema = z.record(
  z.string(),
  z.object({ condition: z.string(), message: z.string() }),
);

// ── Visibility schema ────────────────────────────────────────────────────────

const showOnSchema = z
  .enum(["all", "form", "detail", "list"])
  .default("all");

// ── Currency display config ──────────────────────────────────────────────────

const currencyConfigSchema = z.object({
  symbol: z.string().default("$"),
  precision: z.number().int().min(0).max(6).default(2),
});

// ── Reference field config ───────────────────────────────────────────────────

const referenceConfigSchema = z.object({
  target: z.string(),
  displayField: z.string().optional(),
});

// ── Base field properties (common to all field types) ────────────────────────

const baseFieldSchema = z.object({
  type: fieldTypeSchema,
  required: z.boolean().default(false),
  max: z.number().optional(),
  min: z.number().optional(),
  default: z.unknown().optional(),
  showOn: showOnSchema,
  hideOn: z.array(z.string()).default([]),
  filterable: z.boolean().default(false),
  sortable: z.boolean().default(true),
  searchable: z.boolean().default(false),
  label: z.string().optional(),
  description: z.string().optional(),
});

// ── Field schema with type-specific discrimination ───────────────────────────

export const fieldSchema = baseFieldSchema
  .extend({
    // Enum-specific
    values: z.array(z.string()).optional(),
    transitions: enumTransitionsSchema.optional(),
    transitionGuards: enumTransitionGuardsSchema.optional(),
    // Number-specific
    step: z.number().optional(),
    // Reference-specific
    target: z.string().optional(),
    displayField: z.string().optional(),
    // Currency-specific
    currency: currencyConfigSchema.optional(),
    // String-specific
    pattern: z.string().optional(),
  })
  .superRefine((field, ctx) => {
    // Enum fields must have values
    if (field.type === "enum" && (!field.values || field.values.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enum fields must have a non-empty 'values' array",
        path: ["values"],
      });
    }

    // Non-enum fields should not have values
    if (field.type !== "enum" && field.values) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "'values' is only valid for enum fields",
        path: ["values"],
      });
    }

    // Transitions only valid for enum fields
    if (field.type !== "enum" && field.transitions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "'transitions' is only valid for enum fields",
        path: ["transitions"],
      });
    }

    // Reference fields must have target
    if (field.type === "reference" && !field.target) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reference fields must have a 'target' table name",
        path: ["target"],
      });
    }

    // min > max constraint
    if (
      field.min !== undefined &&
      field.max !== undefined &&
      field.min > field.max
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `'min' (${field.min}) cannot be greater than 'max' (${field.max})`,
        path: ["min"],
      });
    }

    // Transition targets must exist in values
    if (field.type === "enum" && field.transitions && field.values) {
      const validValues = new Set(field.values);
      for (const [fromState, toStates] of Object.entries(field.transitions)) {
        if (!validValues.has(fromState)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Transition source '${fromState}' is not in values: [${field.values.join(", ")}]`,
            path: ["transitions", fromState],
          });
        }
        for (const toState of toStates) {
          if (!validValues.has(toState)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Transition target '${toState}' is not in values: [${field.values.join(", ")}]`,
              path: ["transitions", fromState],
            });
          }
        }
      }
    }
  });

export type Field = z.infer<typeof fieldSchema>;

// ── Fields map (the `fields:` section of feather.yaml) ───────────────────────

export const fieldsMapSchema = z.record(z.string(), fieldSchema);
export type FieldsMap = z.infer<typeof fieldsMapSchema>;
