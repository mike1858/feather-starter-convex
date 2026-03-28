/**
 * YAML resolver for feature definitions.
 * Loads feature YAML, merges with defaults, computes auto-indexes, assigns enum colors.
 *
 * @typedef {import('./types.ts').FeatureConfig} FeatureConfig
 * @typedef {import('./types.ts').FieldConfig} FieldConfig
 * @typedef {import('./types.ts').IndexConfig} IndexConfig
 */

import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import deepmerge from "deepmerge";

const DEFAULTS_PATH = path.resolve(
  import.meta.dirname,
  "../../templates/defaults.yaml",
);

/**
 * Load and parse a feature YAML file.
 * @param {string} featurePath - Absolute path to the .gen.yaml file
 * @returns {Record<string, unknown>} Parsed YAML object
 */
export function loadFeatureYaml(featurePath) {
  const content = fs.readFileSync(featurePath, "utf8");
  return YAML.parse(content);
}

/**
 * Merge feature config with defaults.yaml, apply field-type defaults,
 * compute auto-indexes, and assign enum color palette slots.
 * @param {Record<string, unknown>} featureConfig - Parsed feature YAML
 * @param {string} [defaultsPath] - Optional override for defaults.yaml path
 * @returns {FeatureConfig} Fully resolved feature configuration
 */
export function resolveDefaults(featureConfig, defaultsPath) {
  const defaults = YAML.parse(
    fs.readFileSync(defaultsPath || DEFAULTS_PATH, "utf8"),
  );

  // Deep merge top-level sections (behaviors, access, views, operations, i18n)
  const merged = deepmerge(defaults, featureConfig, {
    // Don't merge arrays — feature overrides replace default arrays entirely
    arrayMerge: (_target, source) => source,
  });

  // Remove internal defaults keys (not part of FeatureConfig)
  delete merged.field_defaults;
  delete merged.field_type_defaults;

  // Resolve fields: apply field_defaults and field_type_defaults per field
  const fieldDefaults = defaults.field_defaults || {};
  const fieldTypeDefaults = defaults.field_type_defaults || {};
  const resolvedFields = {};

  for (const [fieldName, fieldValue] of Object.entries(merged.fields || {})) {
    const fieldConfig = fieldValue || {};

    // Start with base field defaults
    let resolved = { ...fieldDefaults, ...fieldConfig };

    // Apply field-type-specific defaults (e.g., text gets max: 5000)
    const fieldType = resolved.type || "string";
    const typeDefaults = fieldTypeDefaults[fieldType];
    if (typeDefaults) {
      // Type defaults fill in gaps, but don't override explicit feature values
      resolved = { ...fieldDefaults, ...typeDefaults, ...fieldConfig };
    }

    // Assign enum color palette slots
    if (fieldType === "enum" && resolved.values && !resolved.colors) {
      resolved.colors = {};
      for (let i = 0; i < resolved.values.length; i++) {
        resolved.colors[resolved.values[i]] = i % 8;
      }
    }

    resolvedFields[fieldName] = resolved;
  }

  merged.fields = resolvedFields;

  // Compute auto-indexes (dedup by both name AND lead column to avoid duplicates)
  const indexes = merged.indexes || [];
  const existingNames = new Set(indexes.map((idx) => idx.name));
  const existingLeadColumns = new Set(
    indexes.filter((idx) => idx.fields.length === 1).map((idx) => idx.fields[0]),
  );

  // Always add by_userId
  if (!existingNames.has("by_userId") && !existingLeadColumns.has("userId")) {
    indexes.push({ name: "by_userId", fields: ["userId"] });
    existingNames.add("by_userId");
    existingLeadColumns.add("userId");
  }

  // Add by_{field} for filterable or enum fields
  for (const [fieldName, fieldConfig] of Object.entries(merged.fields)) {
    const indexName = `by_${fieldName}`;
    if (
      !existingNames.has(indexName) &&
      !existingLeadColumns.has(fieldName) &&
      (fieldConfig.filterable === true || fieldConfig.type === "enum")
    ) {
      indexes.push({ name: indexName, fields: [fieldName] });
      existingNames.add(indexName);
      existingLeadColumns.add(fieldName);
    }
  }

  // Add by_{column} for belongs_to relationships
  if (merged.relationships) {
    for (const rel of Object.values(merged.relationships)) {
      if (rel.type === "belongs_to" && rel.column) {
        const indexName = `by_${rel.column}`;
        if (!existingNames.has(indexName) && !existingLeadColumns.has(rel.column)) {
          indexes.push({ name: indexName, fields: [rel.column] });
          existingNames.add(indexName);
          existingLeadColumns.add(rel.column);
        }
      }
    }
  }

  merged.indexes = indexes;

  // Compute statusFieldKey: first enum field with transitions (used by test templates)
  for (const [fieldName, fieldConfig] of Object.entries(merged.fields)) {
    if (fieldConfig.type === "enum" && fieldConfig.transitions) {
      merged.statusFieldKey = fieldName;
      break;
    }
  }

  return merged;
}

/**
 * Serialize a resolved config to YAML and write to disk.
 * @param {FeatureConfig | Record<string, unknown>} config - Resolved feature config
 * @param {string} outputPath - Absolute path for the output file
 */
export function writeResolvedYaml(config, outputPath) {
  const yamlStr = YAML.stringify(config, { lineWidth: 120 });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, yamlStr, "utf8");
}
