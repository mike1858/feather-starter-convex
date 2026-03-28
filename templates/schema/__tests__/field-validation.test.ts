import { describe, it, expect } from "vitest";
import { fieldSchema, fieldsMapSchema } from "../field.schema";

describe("fieldSchema — all 11 field types", () => {
  it("validates string field", () => {
    const result = fieldSchema.safeParse({
      type: "string",
      required: true,
      max: 200,
    });
    expect(result.success).toBe(true);
  });

  it("validates text field", () => {
    const result = fieldSchema.safeParse({ type: "text", max: 5000 });
    expect(result.success).toBe(true);
  });

  it("validates number field with min/max/step", () => {
    const result = fieldSchema.safeParse({
      type: "number",
      min: 0,
      max: 100,
      step: 0.5,
    });
    expect(result.success).toBe(true);
  });

  it("validates boolean field", () => {
    const result = fieldSchema.safeParse({
      type: "boolean",
      default: false,
    });
    expect(result.success).toBe(true);
  });

  it("validates enum field with values", () => {
    const result = fieldSchema.safeParse({
      type: "enum",
      values: ["todo", "in_progress", "done"],
      default: "todo",
    });
    expect(result.success).toBe(true);
  });

  it("validates enum field with transitions", () => {
    const result = fieldSchema.safeParse({
      type: "enum",
      values: ["todo", "in_progress", "done"],
      transitions: {
        todo: ["in_progress"],
        in_progress: ["done"],
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates date field", () => {
    const result = fieldSchema.safeParse({ type: "date" });
    expect(result.success).toBe(true);
  });

  it("validates reference field with target", () => {
    const result = fieldSchema.safeParse({
      type: "reference",
      target: "projects",
    });
    expect(result.success).toBe(true);
  });

  it("validates email field", () => {
    const result = fieldSchema.safeParse({ type: "email", required: true });
    expect(result.success).toBe(true);
  });

  it("validates url field", () => {
    const result = fieldSchema.safeParse({ type: "url" });
    expect(result.success).toBe(true);
  });

  it("validates currency field", () => {
    const result = fieldSchema.safeParse({
      type: "currency",
      currency: { symbol: "$", precision: 2 },
    });
    expect(result.success).toBe(true);
  });

  it("validates percentage field", () => {
    const result = fieldSchema.safeParse({ type: "percentage", min: 0, max: 100 });
    expect(result.success).toBe(true);
  });
});

describe("fieldSchema — validation errors", () => {
  it("rejects unknown field type", () => {
    const result = fieldSchema.safeParse({ type: "unknown_type" });
    expect(result.success).toBe(false);
  });

  it("rejects enum without values", () => {
    const result = fieldSchema.safeParse({ type: "enum" });
    expect(result.success).toBe(false);
  });

  it("rejects enum with empty values array", () => {
    const result = fieldSchema.safeParse({ type: "enum", values: [] });
    expect(result.success).toBe(false);
  });

  it("rejects min > max", () => {
    const result = fieldSchema.safeParse({ type: "string", min: 10, max: 5 });
    expect(result.success).toBe(false);
  });

  it("rejects reference without target", () => {
    const result = fieldSchema.safeParse({ type: "reference" });
    expect(result.success).toBe(false);
  });

  it("rejects values on non-enum field", () => {
    const result = fieldSchema.safeParse({
      type: "string",
      values: ["a", "b"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects transitions on non-enum field", () => {
    const result = fieldSchema.safeParse({
      type: "string",
      transitions: { a: ["b"] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects enum transition to non-existent state", () => {
    const result = fieldSchema.safeParse({
      type: "enum",
      values: ["a", "b"],
      transitions: { a: ["c"] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects enum transition from non-existent state", () => {
    const result = fieldSchema.safeParse({
      type: "enum",
      values: ["a", "b"],
      transitions: { x: ["a"] },
    });
    expect(result.success).toBe(false);
  });
});

describe("fieldsMapSchema", () => {
  it("validates a map of fields", () => {
    const result = fieldsMapSchema.safeParse({
      title: { type: "string", required: true, max: 200 },
      status: {
        type: "enum",
        values: ["todo", "done"],
        filterable: true,
      },
      count: { type: "number", min: 0 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects map with invalid field", () => {
    const result = fieldsMapSchema.safeParse({
      good: { type: "string" },
      bad: { type: "invalid" },
    });
    expect(result.success).toBe(false);
  });
});
