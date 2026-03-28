import { describe, it, expect } from "vitest";
import { relationshipSchema, childEntitySchema } from "../relationships.schema";

describe("relationshipSchema", () => {
  it("validates belongs_to with required", () => {
    const result = relationshipSchema.safeParse({
      type: "belongs_to",
      target: "projects",
      required: true,
      column: "projectId",
    });
    expect(result.success).toBe(true);
  });

  it("validates belongs_to with optional (default)", () => {
    const result = relationshipSchema.safeParse({
      type: "belongs_to",
      target: "customers",
      column: "customerId",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("belongs_to");
    }
  });

  it("validates belongs_to with fetchFrom", () => {
    const result = relationshipSchema.safeParse({
      type: "belongs_to",
      target: "projects",
      column: "projectId",
      fetchFrom: ["name", "status"],
    });
    expect(result.success).toBe(true);
  });

  it("validates has_many", () => {
    const result = relationshipSchema.safeParse({
      type: "has_many",
      target: "subtasks",
      foreignKey: "taskId",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid relationship type", () => {
    const result = relationshipSchema.safeParse({
      type: "invalid_type",
      target: "stuff",
    });
    expect(result.success).toBe(false);
  });

  it("rejects belongs_to without column", () => {
    const result = relationshipSchema.safeParse({
      type: "belongs_to",
      target: "projects",
    });
    expect(result.success).toBe(false);
  });

  it("rejects has_many without foreignKey", () => {
    const result = relationshipSchema.safeParse({
      type: "has_many",
      target: "subtasks",
    });
    expect(result.success).toBe(false);
  });
});

describe("childEntitySchema", () => {
  it("validates inline child entity", () => {
    const result = childEntitySchema.safeParse({
      label: "Line Item",
      fields: {
        product: { type: "string", required: true },
        quantity: { type: "number", min: 1 },
        price: { type: "currency", currency: { symbol: "$" } },
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates child with labelPlural and orderable", () => {
    const result = childEntitySchema.safeParse({
      label: "Step",
      labelPlural: "Steps",
      fields: {
        description: { type: "text" },
        completed: { type: "boolean" },
      },
      orderable: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderable).toBe(true);
    }
  });

  it("rejects child without label", () => {
    const result = childEntitySchema.safeParse({
      fields: { title: { type: "string" } },
    });
    expect(result.success).toBe(false);
  });

  it("rejects child without fields", () => {
    const result = childEntitySchema.safeParse({
      label: "Item",
    });
    expect(result.success).toBe(false);
  });

  it("rejects child with invalid field type", () => {
    const result = childEntitySchema.safeParse({
      label: "Item",
      fields: { bad: { type: "invalid" } },
    });
    expect(result.success).toBe(false);
  });
});
