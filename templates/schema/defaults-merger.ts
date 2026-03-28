import * as fs from "node:fs";
import * as path from "node:path";
import YAML from "yaml";
import deepmerge from "deepmerge";
import type { FeatureYaml } from "./feather-yaml.schema";

// ── Array replacement strategy (D-03.2) ──────────────────────────────────────
// Feature YAML arrays replace defaults entirely (no merge).
const overwriteArrayMerge = (
  _target: unknown[],
  source: unknown[],
): unknown[] => source;

// ── Load defaults from YAML file ─────────────────────────────────────────────

interface Defaults {
  field_defaults: Record<string, unknown>;
  field_type_defaults: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

function loadDefaults(projectRoot: string): Defaults {
  const defaultsPath = path.join(projectRoot, "templates", "defaults.yaml");
  const content = fs.readFileSync(defaultsPath, "utf-8");
  return YAML.parse(content) as Defaults;
}

// ── Apply field-level defaults ───────────────────────────────────────────────

function applyFieldDefaults(
  fields: Record<string, Record<string, unknown>>,
  defaults: Defaults,
): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const fieldType = (fieldDef.type as string) || "string";

    // 1. Start with base field defaults
    let merged = { ...defaults.field_defaults };

    // 2. Apply type-specific defaults
    const typeDefaults = defaults.field_type_defaults[fieldType];
    if (typeDefaults) {
      merged = { ...merged, ...typeDefaults };
    }

    // 3. Apply user's field definition (overrides everything)
    merged = { ...merged, ...fieldDef };

    result[fieldName] = merged;
  }

  return result;
}

// ── Merge feature YAML with defaults ─────────────────────────────────────────

export function mergeWithDefaults(
  featureYaml: Record<string, unknown>,
  projectRoot: string,
): FeatureYaml {
  const defaults = loadDefaults(projectRoot);

  // Extract field-level defaults and feature-level defaults
  const { field_defaults, field_type_defaults, ...featureDefaults } = defaults;

  // Apply field-level defaults to each field
  const fields = featureYaml.fields as
    | Record<string, Record<string, unknown>>
    | undefined;
  const mergedFields = fields
    ? applyFieldDefaults(fields, defaults)
    : {};

  // Merge feature-level defaults with user config
  const merged = deepmerge(featureDefaults, featureYaml, {
    arrayMerge: overwriteArrayMerge,
  }) as Record<string, unknown>;

  // Override fields with the fully-defaulted version
  merged.fields = mergedFields;

  return merged as unknown as FeatureYaml;
}
