import YAML, { LineCounter } from "yaml";
import { z } from "zod";
import { featureYamlSchema, projectYamlSchema } from "./feather-yaml.schema";

// ── Formatted error type ─────────────────────────────────────────────────────

export interface FormattedError {
  path: string;
  message: string;
  line: number | null;
}

export interface ValidationSuccess {
  success: true;
  data: z.infer<typeof featureYamlSchema>;
}

export interface ValidationFailure {
  success: false;
  errors: FormattedError[];
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// ── Path-to-line mapping using YAML lineCounter ──────────────────────────────

function buildLineMap(
  doc: YAML.Document,
  lineCounter: LineCounter,
): Map<string, number> {
  const lineMap = new Map<string, number>();

  function walk(node: unknown, currentPath: string): void {
    if (YAML.isMap(node)) {
      for (const pair of node.items) {
        const key = YAML.isScalar(pair.key)
          ? String(pair.key.value)
          : String(pair.key);
        const childPath = currentPath ? `${currentPath}.${key}` : key;
        if (YAML.isScalar(pair.key) && pair.key.range) {
          const pos = lineCounter.linePos(pair.key.range[0]);
          lineMap.set(childPath, pos.line);
        }
        walk(pair.value, childPath);
      }
    } else if (YAML.isSeq(node)) {
      for (let i = 0; i < node.items.length; i++) {
        const item = node.items[i];
        const childPath = `${currentPath}[${i}]`;
        if (YAML.isScalar(item) && item.range) {
          const pos = lineCounter.linePos(item.range[0]);
          lineMap.set(childPath, pos.line);
        } else if (YAML.isNode(item) && item.range) {
          const pos = lineCounter.linePos(item.range[0]);
          lineMap.set(childPath, pos.line);
        }
        walk(item, childPath);
      }
    }
  }

  walk(doc.contents, "");
  return lineMap;
}

function findLineForPath(
  lineMap: Map<string, number>,
  zodPath: (string | number)[],
): number | null {
  // Build a dotted path from Zod's path array
  const pathStr = zodPath
    .map((segment, i) =>
      typeof segment === "number" ? `[${segment}]` : i > 0 ? `.${segment}` : segment,
    )
    .join("");

  // Try exact match first, then progressively shorter prefixes
  if (lineMap.has(pathStr)) return lineMap.get(pathStr) ?? null;

  // Try without last segment
  for (let i = zodPath.length - 1; i >= 0; i--) {
    const prefix = zodPath
      .slice(0, i)
      .map((segment, j) =>
        typeof segment === "number" ? `[${segment}]` : j > 0 ? `.${segment}` : segment,
      )
      .join("");
    if (lineMap.has(prefix)) return lineMap.get(prefix) ?? null;
  }

  return null;
}

// ── Cross-field validation ───────────────────────────────────────────────────

function crossFieldValidate(
  data: Record<string, unknown>,
  lineMap: Map<string, number>,
): FormattedError[] {
  const errors: FormattedError[] = [];
  const fields = data.fields as Record<string, Record<string, unknown>> | undefined;

  if (!fields) return errors;

  // statusFlow.field must reference an existing enum field
  const statusFlow = data.statusFlow as Record<string, unknown> | undefined;
  if (statusFlow?.field) {
    const fieldName = statusFlow.field as string;
    const field = fields[fieldName];
    if (!field) {
      errors.push({
        path: "statusFlow.field",
        message: `statusFlow.field references '${fieldName}' which does not exist in fields`,
        line: lineMap.get("statusFlow.field") ?? null,
      });
    } else if (field.type !== "enum") {
      errors.push({
        path: "statusFlow.field",
        message: `statusFlow.field references '${fieldName}' which is type '${field.type}', not 'enum'`,
        line: lineMap.get("statusFlow.field") ?? null,
      });
    }
  }

  // Enum transition targets must exist in values
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    const fd = fieldDef as Record<string, unknown>;
    if (fd.type === "enum" && fd.transitions && fd.values) {
      const values = fd.values as string[];
      const transitions = fd.transitions as Record<string, string[]>;
      const validValues = new Set(values);
      for (const [fromState, toStates] of Object.entries(transitions)) {
        if (!validValues.has(fromState)) {
          errors.push({
            path: `fields.${fieldName}.transitions.${fromState}`,
            message: `Transition source '${fromState}' is not in values: [${values.join(", ")}]`,
            line:
              lineMap.get(`fields.${fieldName}.transitions.${fromState}`) ??
              null,
          });
        }
        for (const toState of toStates) {
          if (!validValues.has(toState)) {
            errors.push({
              path: `fields.${fieldName}.transitions.${fromState}`,
              message: `Transition target '${toState}' is not in values: [${values.join(", ")}]`,
              line:
                lineMap.get(`fields.${fieldName}.transitions.${fromState}`) ??
                null,
            });
          }
        }
      }
    }

    // Reference fields must have target
    if (fd.type === "reference" && !fd.target) {
      errors.push({
        path: `fields.${fieldName}.target`,
        message: "Reference fields must have a 'target' table name",
        line: lineMap.get(`fields.${fieldName}`) ?? null,
      });
    }
  }

  // Identity expression requires format with placeholder
  const identity = data.identity as Record<string, unknown> | undefined;
  if (identity?.type === "expression") {
    const format = identity.format as string | undefined;
    if (!format || !format.includes("{")) {
      errors.push({
        path: "identity.format",
        message:
          'Expression identity requires a format string with at least one {placeholder}',
        line: lineMap.get("identity.format") ?? lineMap.get("identity") ?? null,
      });
    }
  }

  // Note: detailView.relatedRecords sources reference separate entities
  // (e.g., subtasks, workLogs) which have their own YAML files.
  // Cross-entity validation requires all YAMLs and happens at pipeline level,
  // not in single-file validation. Only children (inline entities) can be
  // validated here since they're defined in the same YAML.

  return errors;
}

// ── Main validation function ─────────────────────────────────────────────────

export function validateFeatureYaml(yamlContent: string): ValidationResult {
  // Parse YAML with line counter
  const lineCounter = new LineCounter();
  let doc: YAML.Document;
  try {
    doc = YAML.parseDocument(yamlContent, { lineCounter });
  } catch {
    return {
      success: false,
      errors: [
        { path: "", message: "Invalid YAML syntax", line: null },
      ],
    };
  }

  const data = doc.toJS() as Record<string, unknown>;

  // Build line map for error messages
  const lineMap = buildLineMap(doc, lineCounter);

  // Validate against Zod schema
  const result = featureYamlSchema.safeParse(data);

  if (!result.success) {
    const errors: FormattedError[] = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      line: findLineForPath(lineMap, issue.path),
    }));
    return { success: false, errors };
  }

  // Cross-field validation
  const crossErrors = crossFieldValidate(data, lineMap);
  if (crossErrors.length > 0) {
    return { success: false, errors: crossErrors };
  }

  return { success: true, data: result.data };
}

// ── Project YAML validation ──────────────────────────────────────────────────

export function validateProjectYaml(
  yamlContent: string,
): { success: true; data: z.infer<typeof projectYamlSchema> } | ValidationFailure {
  const lineCounter = new LineCounter();
  let doc: YAML.Document;
  try {
    doc = YAML.parseDocument(yamlContent, { lineCounter });
  } catch {
    return {
      success: false,
      errors: [{ path: "", message: "Invalid YAML syntax", line: null }],
    };
  }

  const data = doc.toJS() as Record<string, unknown>;
  const lineMap = buildLineMap(doc, lineCounter);

  const result = projectYamlSchema.safeParse(data);
  if (!result.success) {
    const errors: FormattedError[] = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      line: findLineForPath(lineMap, issue.path),
    }));
    return { success: false, errors };
  }

  return { success: true, data: result.data };
}
