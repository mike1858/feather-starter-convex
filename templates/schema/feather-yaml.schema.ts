import { z } from "zod";
import { fieldsMapSchema } from "./field.schema";
import { accessSchema } from "./access.schema";
import { statusFlowSchema } from "./status-flow.schema";
import { hooksSchema } from "./hooks.schema";
import { derivedDataItemSchema } from "./derived-data.schema";
import { viewsSchema } from "./views.schema";
import { identitySchema } from "./identity.schema";
import { scheduleSchema } from "./schedules.schema";
import { integrationSchema } from "./integrations.schema";
import { relationshipSchema, childEntitySchema } from "./relationships.schema";
import { detailViewSchema } from "./detail-view.schema";

// ── Feature YAML Schema (per-feature feather.yaml) ───────────────────────────

export const featureYamlSchema = z.object({
  name: z.string(),
  label: z.string(),
  labelPlural: z.string().optional(),

  // Baseline
  fields: fieldsMapSchema,
  timestamps: z
    .union([z.boolean(), z.enum(["both", "created", "updated", "none"])])
    .default("both"),
  identity: identitySchema,

  // 8 Dimensions (all optional — progressive disclosure)
  access: accessSchema.optional(),
  statusFlow: statusFlowSchema.optional(),
  hooks: hooksSchema.optional(),
  derivedData: z.record(z.string(), derivedDataItemSchema).optional(),
  views: viewsSchema.optional(),
  schedules: z.record(z.string(), scheduleSchema).optional(),
  integrations: z.record(z.string(), integrationSchema).optional(),

  // Relationships
  relationships: z.record(z.string(), relationshipSchema).optional(),
  children: z.record(z.string(), childEntitySchema).optional(),

  // Detail View Composition (D-04)
  detailView: detailViewSchema.optional(),

  // Operations
  operations: z
    .object({
      create: z.boolean().default(true),
      read: z.boolean().default(true),
      update: z.boolean().default(true),
      delete: z.boolean().default(true),
    })
    .default({ create: true, read: true, update: true, delete: true }),

  // Behaviors (legacy compat + extensions)
  behaviors: z
    .object({
      assignable: z.boolean().default(false),
      orderable: z.boolean().default(false),
      softDelete: z.boolean().default(false),
      auditTrail: z.boolean().default(false),
    })
    .optional(),

  // Override pointers (D-08)
  overrides: z.record(z.string(), z.string()).optional(),

  // Search
  search: z.boolean().default(false),
  searchFields: z.array(z.string()).optional(),

  // Indexes
  indexes: z
    .array(
      z.object({
        name: z.string(),
        fields: z.array(z.string()),
      }),
    )
    .optional(),

  // i18n
  i18n: z
    .object({
      languages: z.array(z.string()).default(["en", "es"]),
    })
    .optional(),
});

export type FeatureYaml = z.infer<typeof featureYamlSchema>;

// ── Root Project YAML Schema (feather.yaml at project root) ──────────────────

export const projectYamlSchema = z.object({
  name: z.string(),
  version: z.string().default("1.0.0"),
  branding: z
    .object({
      appName: z.string(),
      primaryColor: z.string().optional(),
      logo: z.string().optional(),
    })
    .optional(),
  features: z.array(z.string()).default([]),
  bundles: z.array(z.string()).default([]),
  settings: z
    .object({
      i18n: z
        .object({
          languages: z.array(z.string()).default(["en", "es"]),
        })
        .optional(),
      auth: z
        .object({
          providers: z.array(z.string()).default(["password"]),
        })
        .optional(),
    })
    .optional(),
  registry: z
    .object({
      url: z.string().url(),
    })
    .optional(),
});

export type ProjectYaml = z.infer<typeof projectYamlSchema>;
