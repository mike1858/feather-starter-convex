import { describe, it, expect } from "vitest";
import * as yaml from "yaml";
import { generateFeatherYaml, generateAllYamls } from "./yaml-generator";
import { validateFeatureYaml } from "../../schema/yaml-validator";
import type { InferredEntity, InferredField } from "./type-inference";
import type { DetectedRelationship } from "./entity-classifier";

// ── Test Helpers ────────────────────────────────────────────────────────────

function makeField(overrides: Partial<InferredField> & { name: string; type: InferredField["type"] }): InferredField {
  return {
    required: false,
    confidence: 80,
    ...overrides,
  };
}

function makeEntity(
  overrides: Partial<InferredEntity> & { name: string },
): InferredEntity {
  return {
    label: overrides.name.charAt(0).toUpperCase() + overrides.name.slice(1),
    labelPlural: overrides.name.charAt(0).toUpperCase() + overrides.name.slice(1) + "s",
    entityType: "master",
    confidence: 80,
    fields: {},
    sourceSheet: overrides.name,
    ...overrides,
  };
}

// ── generateFeatherYaml ─────────────────────────────────────────────────────

describe("generateFeatherYaml", () => {
  it("generates valid YAML string for a simple entity", () => {
    const entity = makeEntity({
      name: "employees",
      fields: {
        name: makeField({ name: "name", type: "string", required: true, max: 200 }),
        email: makeField({ name: "email", type: "email", required: true }),
      },
    });

    const result = generateFeatherYaml({ entity, relationships: [] });

    expect(result.entityName).toBe("employees");
    expect(result.filePath).toBe("src/features/employees/feather.yaml");
    expect(result.yamlContent).toContain("name: employees");
    expect(result.yamlContent).toContain("label:");

    // Parse YAML back and verify structure
    const parsed = yaml.parse(result.yamlContent);
    expect(parsed.name).toBe("employees");
    expect(parsed.fields.name.type).toBe("string");
    expect(parsed.fields.name.required).toBe(true);
    expect(parsed.fields.email.type).toBe("email");
  });

  it("sets timestamps to 'both' by default", () => {
    const entity = makeEntity({
      name: "products",
      fields: {
        name: makeField({ name: "name", type: "string", required: true }),
      },
    });

    const result = generateFeatherYaml({ entity, relationships: [] });
    const parsed = yaml.parse(result.yamlContent);

    expect(parsed.timestamps).toBe("both");
  });

  it("sets identity to auto-increment by default", () => {
    const entity = makeEntity({
      name: "items",
      fields: {
        title: makeField({ name: "title", type: "string", required: true }),
      },
    });

    const result = generateFeatherYaml({ entity, relationships: [] });
    const parsed = yaml.parse(result.yamlContent);

    expect(parsed.identity).toEqual({ type: "auto-increment" });
  });

  it("generates relationships section when entity has detected relationships", () => {
    const entity = makeEntity({
      name: "orders",
      fields: {
        title: makeField({ name: "title", type: "string", required: true }),
        customerId: makeField({ name: "customerId", type: "reference", referenceTarget: "customers" }),
      },
    });

    const relationships: DetectedRelationship[] = [
      {
        sourceEntity: "orders",
        sourceField: "customerId",
        targetEntity: "customers",
        targetField: "name",
        type: "belongs_to",
        confidence: 85,
      },
    ];

    const result = generateFeatherYaml({ entity, relationships });
    const parsed = yaml.parse(result.yamlContent);

    expect(parsed.relationships).toBeDefined();
    expect(parsed.relationships.customers).toEqual({
      type: "belongs_to",
      target: "customers",
      required: false,
      column: "customerId",
    });
  });

  it("adds statusFlow when entity has a status-like enum field", () => {
    const entity = makeEntity({
      name: "tickets",
      fields: {
        title: makeField({ name: "title", type: "string", required: true }),
        status: makeField({
          name: "status",
          type: "enum",
          required: true,
          enumValues: ["open", "in_progress", "closed"],
        }),
      },
    });

    const result = generateFeatherYaml({ entity, relationships: [] });
    const parsed = yaml.parse(result.yamlContent);

    expect(parsed.statusFlow).toBeDefined();
    expect(parsed.statusFlow.field).toBe("status");
    expect(parsed.statusFlow.transitions).toEqual({
      open: ["in_progress"],
      in_progress: ["closed"],
    });
  });

  it("adds search fields for entities with string/text fields (max 3)", () => {
    const entity = makeEntity({
      name: "articles",
      fields: {
        title: makeField({ name: "title", type: "string", required: true }),
        subtitle: makeField({ name: "subtitle", type: "string" }),
        body: makeField({ name: "body", type: "text" }),
        author: makeField({ name: "author", type: "string" }),
        views: makeField({ name: "views", type: "number" }),
      },
    });

    const result = generateFeatherYaml({ entity, relationships: [] });
    const parsed = yaml.parse(result.yamlContent);

    expect(parsed.search).toBe(true);
    expect(parsed.searchFields).toHaveLength(3);
    expect(parsed.searchFields).toEqual(["title", "subtitle", "body"]);
  });

  it("sets auditTrail=true for transaction entities", () => {
    const entity = makeEntity({
      name: "invoices",
      entityType: "transaction",
      fields: {
        invoiceNumber: makeField({ name: "invoiceNumber", type: "string", required: true }),
        amount: makeField({ name: "amount", type: "currency" }),
      },
    });

    const result = generateFeatherYaml({ entity, relationships: [] });
    const parsed = yaml.parse(result.yamlContent);

    expect(parsed.behaviors.auditTrail).toBe(true);
  });

  it("generated YAML parses back to valid object with expected structure", () => {
    const entity = makeEntity({
      name: "departments",
      entityType: "lookup",
      fields: {
        name: makeField({ name: "name", type: "string", required: true, max: 100 }),
        code: makeField({ name: "code", type: "string", required: true }),
      },
    });

    const result = generateFeatherYaml({ entity, relationships: [] });
    const parsed = yaml.parse(result.yamlContent);

    expect(parsed).toHaveProperty("name");
    expect(parsed).toHaveProperty("label");
    expect(parsed).toHaveProperty("fields");
    expect(parsed).toHaveProperty("timestamps");
    expect(parsed).toHaveProperty("identity");
    expect(parsed).toHaveProperty("access");
    expect(parsed).toHaveProperty("operations");
    expect(parsed).toHaveProperty("behaviors");
    expect(parsed).toHaveProperty("views");
  });

  it("validates generated YAML against featureYamlSchema", () => {
    const entity = makeEntity({
      name: "customers",
      fields: {
        name: makeField({ name: "name", type: "string", required: true, max: 200 }),
        email: makeField({ name: "email", type: "email", required: true }),
        status: makeField({
          name: "status",
          type: "enum",
          required: true,
          enumValues: ["active", "inactive"],
        }),
      },
    });

    const result = generateFeatherYaml({ entity, relationships: [] });
    const validation = validateFeatureYaml(result.yamlContent);

    expect(validation.success).toBe(true);
    if (validation.success) {
      expect(validation.data.name).toBe("customers");
    }
  });

  it("validates generated YAML with relationships against featureYamlSchema", () => {
    const entity = makeEntity({
      name: "orders",
      entityType: "transaction",
      fields: {
        title: makeField({ name: "title", type: "string", required: true }),
        amount: makeField({ name: "amount", type: "currency" }),
        customerId: makeField({ name: "customerId", type: "reference", referenceTarget: "customers" }),
      },
    });

    const relationships: DetectedRelationship[] = [
      {
        sourceEntity: "orders",
        sourceField: "customerId",
        targetEntity: "customers",
        targetField: "name",
        type: "belongs_to",
        confidence: 85,
      },
    ];

    const result = generateFeatherYaml({ entity, relationships });
    const validation = validateFeatureYaml(result.yamlContent);

    expect(validation.success).toBe(true);
  });
});

// ── generateAllYamls ────────────────────────────────────────────────────────

describe("generateAllYamls", () => {
  it("produces one YAML per entity", () => {
    const entities: InferredEntity[] = [
      makeEntity({
        name: "departments",
        fields: {
          name: makeField({ name: "name", type: "string", required: true }),
        },
      }),
      makeEntity({
        name: "employees",
        fields: {
          name: makeField({ name: "name", type: "string", required: true }),
        },
      }),
    ];

    const results = generateAllYamls(entities, []);

    expect(results).toHaveLength(2);
    expect(results[0].entityName).toBe("departments");
    expect(results[1].entityName).toBe("employees");
    expect(results[0].filePath).toBe("src/features/departments/feather.yaml");
    expect(results[1].filePath).toBe("src/features/employees/feather.yaml");
  });
});
