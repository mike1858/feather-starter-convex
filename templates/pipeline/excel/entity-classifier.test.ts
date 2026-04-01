import { describe, it, expect } from "vitest";
import {
  detectRelationships,
  computeImportOrder,
  classifyWorkbook,
} from "./entity-classifier";
import type { InferredEntity } from "./type-inference";
import type { SheetMetadata } from "./parser";

// ── Test Helpers ────────────────────────────────────────────────────────────

function makeEntity(
  overrides: Partial<InferredEntity> & { name: string },
): InferredEntity {
  return {
    label: overrides.name,
    labelPlural: overrides.name + "s",
    entityType: "master",
    confidence: 80,
    fields: {},
    sourceSheet: overrides.name,
    ...overrides,
  };
}

function makeSheet(name: string): SheetMetadata {
  return {
    name,
    rowCount: 10,
    columnCount: 3,
    columns: [],
    sampleRows: [],
  };
}

// ── detectRelationships ─────────────────────────────────────────────────────

describe("detectRelationships", () => {
  it("finds 'departmentId' → 'departments' relationship via Id suffix pattern", () => {
    const entities: InferredEntity[] = [
      makeEntity({
        name: "employees",
        fields: {
          name: { name: "name", type: "string", required: true, confidence: 90 },
          departmentId: { name: "departmentId", type: "string", required: true, confidence: 75 },
        },
      }),
      makeEntity({
        name: "departments",
        fields: {
          name: { name: "name", type: "string", required: true, confidence: 90 },
        },
      }),
    ];
    const sheets = [makeSheet("Employees"), makeSheet("Departments")];

    const relationships = detectRelationships(entities, sheets);

    expect(relationships).toHaveLength(1);
    expect(relationships[0]).toEqual({
      sourceEntity: "employees",
      sourceField: "departmentId",
      targetEntity: "departments",
      targetField: "name",
      type: "belongs_to",
      confidence: 85,
    });
  });

  it("finds field name matching sheet name (e.g., 'department' column with 'departments' entity)", () => {
    const entities: InferredEntity[] = [
      makeEntity({
        name: "employees",
        fields: {
          name: { name: "name", type: "string", required: true, confidence: 90 },
          department: { name: "department", type: "enum", required: true, confidence: 70, enumValues: ["Engineering", "Sales"] },
        },
      }),
      makeEntity({
        name: "departments",
        entityType: "lookup",
        fields: {
          name: { name: "name", type: "string", required: true, confidence: 90 },
        },
      }),
    ];
    const sheets = [makeSheet("Employees"), makeSheet("Departments")];

    const relationships = detectRelationships(entities, sheets);

    expect(relationships).toHaveLength(1);
    expect(relationships[0]).toMatchObject({
      sourceEntity: "employees",
      sourceField: "department",
      targetEntity: "departments",
      type: "belongs_to",
      confidence: 70,
    });
  });

  it("sets field type to 'reference' and referenceTarget when relationship found via Id pattern", () => {
    const entities: InferredEntity[] = [
      makeEntity({
        name: "orders",
        fields: {
          customerId: { name: "customerId", type: "string", required: true, confidence: 75 },
        },
      }),
      makeEntity({
        name: "customers",
        fields: {
          name: { name: "name", type: "string", required: true, confidence: 90 },
        },
      }),
    ];
    const sheets = [makeSheet("Orders"), makeSheet("Customers")];

    detectRelationships(entities, sheets);

    expect(entities[0].fields.customerId.type).toBe("reference");
    expect(entities[0].fields.customerId.referenceTarget).toBe("customers");
  });

  it("sets field type to 'reference' and referenceTarget when relationship found via name match", () => {
    const entities: InferredEntity[] = [
      makeEntity({
        name: "tasks",
        fields: {
          project: { name: "project", type: "enum", required: true, confidence: 70, enumValues: ["Alpha", "Beta"] },
        },
      }),
      makeEntity({
        name: "projects",
        fields: {
          name: { name: "name", type: "string", required: true, confidence: 90 },
        },
      }),
    ];
    const sheets = [makeSheet("Tasks"), makeSheet("Projects")];

    detectRelationships(entities, sheets);

    expect(entities[0].fields.project.type).toBe("reference");
    expect(entities[0].fields.project.referenceTarget).toBe("projects");
  });

  it("returns empty for entities with no cross-references", () => {
    const entities: InferredEntity[] = [
      makeEntity({
        name: "products",
        fields: {
          name: { name: "name", type: "string", required: true, confidence: 90 },
          price: { name: "price", type: "currency", required: true, confidence: 85 },
        },
      }),
      makeEntity({
        name: "categories",
        fields: {
          name: { name: "name", type: "string", required: true, confidence: 90 },
        },
      }),
    ];
    const sheets = [makeSheet("Products"), makeSheet("Categories")];

    const relationships = detectRelationships(entities, sheets);

    expect(relationships).toHaveLength(0);
  });

  it("handles singular/plural matching ('department' matches 'departments')", () => {
    const entities: InferredEntity[] = [
      makeEntity({
        name: "employees",
        fields: {
          department_id: { name: "department_id", type: "string", required: true, confidence: 75 },
        },
      }),
      makeEntity({
        name: "departments",
        fields: {
          name: { name: "name", type: "string", required: true, confidence: 90 },
        },
      }),
    ];
    const sheets = [makeSheet("Employees"), makeSheet("Departments")];

    const relationships = detectRelationships(entities, sheets);

    expect(relationships).toHaveLength(1);
    expect(relationships[0].sourceField).toBe("department_id");
    expect(relationships[0].targetEntity).toBe("departments");
  });
});

// ── computeImportOrder ──────────────────────────────────────────────────────

describe("computeImportOrder", () => {
  it("returns lookups before masters before transactions", () => {
    const departments = makeEntity({ name: "departments", entityType: "lookup" });
    const employees = makeEntity({ name: "employees", entityType: "master" });
    const orders = makeEntity({ name: "orders", entityType: "transaction" });
    const entities = [orders, employees, departments];

    const relationships = [
      {
        sourceEntity: "employees",
        sourceField: "departmentId",
        targetEntity: "departments",
        targetField: "name",
        type: "belongs_to" as const,
        confidence: 85,
      },
      {
        sourceEntity: "orders",
        sourceField: "employeeId",
        targetEntity: "employees",
        targetField: "name",
        type: "belongs_to" as const,
        confidence: 85,
      },
    ];

    const order = computeImportOrder(entities, relationships);

    const deptIdx = order.indexOf("departments");
    const empIdx = order.indexOf("employees");
    const ordIdx = order.indexOf("orders");

    expect(deptIdx).toBeLessThan(empIdx);
    expect(empIdx).toBeLessThan(ordIdx);
  });

  it("handles entities with no dependencies (placed first)", () => {
    const entityA = makeEntity({ name: "entity-a" });
    const entityB = makeEntity({ name: "entity-b" });
    const entities = [entityA, entityB];

    const order = computeImportOrder(entities, []);

    expect(order).toHaveLength(2);
    expect(order).toContain("entity-a");
    expect(order).toContain("entity-b");
  });

  it("handles circular dependencies (adds remaining at end)", () => {
    const entityA = makeEntity({ name: "entity-a" });
    const entityB = makeEntity({ name: "entity-b" });
    const entities = [entityA, entityB];

    const relationships = [
      {
        sourceEntity: "entity-a",
        sourceField: "bId",
        targetEntity: "entity-b",
        targetField: "name",
        type: "belongs_to" as const,
        confidence: 85,
      },
      {
        sourceEntity: "entity-b",
        sourceField: "aId",
        targetEntity: "entity-a",
        targetField: "name",
        type: "belongs_to" as const,
        confidence: 85,
      },
    ];

    const order = computeImportOrder(entities, relationships);

    // Both entities should appear in the order despite the cycle
    expect(order).toHaveLength(2);
    expect(order).toContain("entity-a");
    expect(order).toContain("entity-b");
  });
});

// ── classifyWorkbook ────────────────────────────────────────────────────────

describe("classifyWorkbook", () => {
  it("returns complete ClassifiedWorkbook with entities, relationships, importOrder", () => {
    const entities: InferredEntity[] = [
      makeEntity({
        name: "departments",
        entityType: "lookup",
        fields: {
          name: { name: "name", type: "string", required: true, confidence: 90 },
        },
      }),
      makeEntity({
        name: "employees",
        entityType: "master",
        fields: {
          name: { name: "name", type: "string", required: true, confidence: 90 },
          departmentId: { name: "departmentId", type: "string", required: true, confidence: 75 },
        },
      }),
    ];
    const sheets = [makeSheet("Departments"), makeSheet("Employees")];

    const result = classifyWorkbook(entities, sheets);

    expect(result.entities).toHaveLength(2);
    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0].sourceEntity).toBe("employees");
    expect(result.relationships[0].targetEntity).toBe("departments");
    expect(result.importOrder).toHaveLength(2);
    // departments should come before employees
    expect(result.importOrder.indexOf("departments")).toBeLessThan(
      result.importOrder.indexOf("employees"),
    );
  });
});
