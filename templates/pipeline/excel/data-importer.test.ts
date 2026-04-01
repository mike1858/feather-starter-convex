// Test Matrix: coerceValue function
// | # | Tier   | Type       | Scenario                                    | Expected                          |
// |---|--------|------------|---------------------------------------------|-----------------------------------|
// | 1 | green  | currency   | "$50,000" -> number                         | 50000, green error logged         |
// | 2 | green  | number     | "50000" string -> number                    | 50000, no error (clean convert)   |
// | 3 | green  | enum       | "active" -> "Active" (case correction)      | "Active", green error logged      |
// | 4 | green  | url        | "example.com" -> "https://example.com"      | prepended, green error logged     |
// | 5 | green  | date       | "2024-01-15" -> ISO date                    | ISO string, green error logged    |
// | 6 | yellow | boolean    | "maybe" -> false (ambiguous)                | false, yellow error logged        |
// | 7 | yellow | enum       | unrecognized value                          | null, yellow error logged         |
// | 8 | red    | number     | "abc" -> number                             | null, red error                   |
// | 9 | red    | required   | empty required field                        | null, red error                   |
// |10 | red    | email      | invalid email format                        | null, red error                   |
// |11 | red    | date       | unparseable date                            | null, red error                   |
// |12 | none   | optional   | empty optional field                        | null, no error                    |
// |13 | none   | boolean    | "yes" -> true (valid)                       | true, no error                    |
// |14 | none   | email      | valid email                                 | lowercase email, no error         |
// |15 | none   | url        | "https://x.com" (already has protocol)      | unchanged, no error               |
//
// Test Matrix: processRow function
// | # | Scenario                              | Expected                                      |
// |---|---------------------------------------|-----------------------------------------------|
// |16 | All fields valid (no red errors)      | success=true, data populated                  |
// |17 | One red error                         | success=false                                 |
// |18 | Multiple columns with mixed errors    | all errors collected                          |
// |19 | Unknown column (no matching field)    | skipped, no error                             |

import { describe, it, expect } from "vitest";
import { coerceValue, processRow } from "./data-importer";
import type { InferredField } from "./type-inference";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeField(overrides: Partial<InferredField> = {}): InferredField {
  return {
    name: "testField",
    type: "string",
    required: false,
    confidence: 90,
    ...overrides,
  };
}

// ── coerceValue tests ────────────────────────────────────────────────────────

describe("coerceValue", () => {
  describe("green tier (auto-fix)", () => {
    it("auto-converts currency string '$50,000' to number 50000", () => {
      const field = makeField({ name: "salary", type: "currency", required: true });
      const result = coerceValue("$50,000", field, "employees", 1);

      expect(result.value).toBe(50000);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe("green");
      expect(result.errors[0].originalValue).toBe("$50,000");
      expect(result.errors[0].fixedValue).toBe("50000");
    });

    it("auto-converts string '50000' to number without error when no symbols", () => {
      const field = makeField({ name: "amount", type: "number", required: true });
      const result = coerceValue("50000", field, "items", 1);

      expect(result.value).toBe(50000);
      // No error because cleaned === strVal (no symbols stripped)
      expect(result.errors).toHaveLength(0);
    });

    it("case-corrects enum 'active' to 'Active'", () => {
      const field = makeField({
        name: "status",
        type: "enum",
        enumValues: ["Active", "Inactive", "Pending"],
      });
      const result = coerceValue("active", field, "users", 1);

      expect(result.value).toBe("Active");
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe("green");
      expect(result.errors[0].fixedValue).toBe("Active");
    });

    it("auto-prepends https:// for URL without protocol", () => {
      const field = makeField({ name: "website", type: "url" });
      const result = coerceValue("example.com", field, "companies", 1);

      expect(result.value).toBe("https://example.com");
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe("green");
      expect(result.errors[0].fixedValue).toBe("https://example.com");
    });

    it("auto-converts date string to ISO format", () => {
      const field = makeField({ name: "startDate", type: "date" });
      const result = coerceValue("2024-01-15", field, "projects", 1);

      expect(result.value).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe("green");
    });
  });

  describe("yellow tier (needs review)", () => {
    it("flags ambiguous boolean 'maybe' with default false", () => {
      const field = makeField({ name: "isActive", type: "boolean" });
      const result = coerceValue("maybe", field, "users", 3);

      expect(result.value).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe("yellow");
      expect(result.errors[0].fixedValue).toBe("false");
      expect(result.errors[0].errorMessage).toContain("Ambiguous");
    });

    it("flags unrecognized enum value with valid options", () => {
      const field = makeField({
        name: "priority",
        type: "enum",
        enumValues: ["Low", "Medium", "High"],
      });
      const result = coerceValue("Critical", field, "tasks", 2);

      expect(result.value).toBe(null);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe("yellow");
      expect(result.errors[0].errorMessage).toContain("Low, Medium, High");
    });
  });

  describe("red tier (unfixable)", () => {
    it("rejects non-numeric value for number field", () => {
      const field = makeField({ name: "quantity", type: "number", required: true });
      const result = coerceValue("abc", field, "orders", 5);

      expect(result.value).toBe(null);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe("red");
      expect(result.errors[0].errorMessage).toContain("Cannot convert");
    });

    it("rejects empty required field", () => {
      const field = makeField({ name: "title", type: "string", required: true });
      const result = coerceValue("", field, "tasks", 1);

      expect(result.value).toBe(null);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe("red");
      expect(result.errors[0].errorMessage).toContain("Required field");
    });

    it("rejects null for required field", () => {
      const field = makeField({ name: "name", type: "string", required: true });
      const result = coerceValue(null, field, "users", 1);

      expect(result.value).toBe(null);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe("red");
    });

    it("rejects invalid email format", () => {
      const field = makeField({ name: "email", type: "email" });
      const result = coerceValue("not-an-email", field, "users", 2);

      expect(result.value).toBe(null);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe("red");
      expect(result.errors[0].errorMessage).toContain("not a valid email");
    });

    it("rejects unparseable date", () => {
      const field = makeField({ name: "deadline", type: "date" });
      const result = coerceValue("not-a-date", field, "tasks", 4);

      expect(result.value).toBe(null);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe("red");
      expect(result.errors[0].errorMessage).toContain("Cannot parse");
    });
  });

  describe("no error cases", () => {
    it("returns null for empty optional field with no error", () => {
      const field = makeField({ name: "notes", type: "string", required: false });
      const result = coerceValue("", field, "items", 1);

      expect(result.value).toBe(null);
      expect(result.errors).toHaveLength(0);
    });

    it("converts valid boolean 'yes' to true", () => {
      const field = makeField({ name: "isActive", type: "boolean" });
      const result = coerceValue("yes", field, "users", 1);

      expect(result.value).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("lowercases valid email without error", () => {
      const field = makeField({ name: "email", type: "email" });
      const result = coerceValue("User@Example.COM", field, "users", 1);

      expect(result.value).toBe("user@example.com");
      expect(result.errors).toHaveLength(0);
    });

    it("passes through URL with existing protocol", () => {
      const field = makeField({ name: "website", type: "url" });
      const result = coerceValue("https://example.com", field, "companies", 1);

      expect(result.value).toBe("https://example.com");
      expect(result.errors).toHaveLength(0);
    });

    it("passes through exact enum match without error", () => {
      const field = makeField({
        name: "status",
        type: "enum",
        enumValues: ["Active", "Inactive"],
      });
      const result = coerceValue("Active", field, "users", 1);

      expect(result.value).toBe("Active");
      expect(result.errors).toHaveLength(0);
    });

    it("passes through plain string without transformation", () => {
      const field = makeField({ name: "title", type: "string" });
      const result = coerceValue("Hello World", field, "items", 1);

      expect(result.value).toBe("Hello World");
      expect(result.errors).toHaveLength(0);
    });

    it("passes through Date object for date field", () => {
      const field = makeField({ name: "startDate", type: "date" });
      const dateObj = new Date("2024-06-15T00:00:00.000Z");
      const result = coerceValue(dateObj, field, "projects", 1);

      expect(result.value).toBe("2024-06-15T00:00:00.000Z");
      expect(result.errors).toHaveLength(0);
    });

    it("handles percentage type (strips % sign)", () => {
      const field = makeField({ name: "rate", type: "percentage" });
      const result = coerceValue("85%", field, "items", 1);

      expect(result.value).toBe(85);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe("green");
    });
  });
});

// ── processRow tests ─────────────────────────────────────────────────────────

describe("processRow", () => {
  const fields: Record<string, InferredField> = {
    name: makeField({ name: "name", type: "string", required: true }),
    email: makeField({ name: "email", type: "email", required: true }),
    age: makeField({ name: "age", type: "number", required: false }),
  };

  it("returns success=true when no red errors", () => {
    const row = ["John", "john@example.com", 30];
    const columns = ["name", "email", "age"];

    const result = processRow(row, columns, fields, "users", 1);

    expect(result.success).toBe(true);
    expect(result.data.name).toBe("John");
    expect(result.data.email).toBe("john@example.com");
    expect(result.data.age).toBe(30);
    expect(result.errors).toHaveLength(0);
  });

  it("returns success=false when any red error exists", () => {
    const row = ["John", "not-an-email", 30];
    const columns = ["name", "email", "age"];

    const result = processRow(row, columns, fields, "users", 2);

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.severity === "red")).toBe(true);
  });

  it("collects all errors from all columns", () => {
    const allRequiredFields: Record<string, InferredField> = {
      name: makeField({ name: "name", type: "string", required: true }),
      email: makeField({ name: "email", type: "email", required: true }),
      count: makeField({ name: "count", type: "number", required: true }),
    };
    const row = ["", "bad-email", "abc"];
    const columns = ["name", "email", "count"];

    const result = processRow(row, columns, allRequiredFields, "items", 3);

    expect(result.success).toBe(false);
    // Empty required name, invalid email, invalid number = 3 red errors
    expect(result.errors.length).toBe(3);
    expect(result.errors.every((e) => e.severity === "red")).toBe(true);
  });

  it("skips unknown columns (no matching field)", () => {
    const row = ["John", "john@example.com", 30, "extra-value"];
    const columns = ["name", "email", "age", "unknownColumn"];

    const result = processRow(row, columns, fields, "users", 1);

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("unknownColumn");
  });

  it("matches camelCase field names from spaced column headers", () => {
    const spacedFields: Record<string, InferredField> = {
      firstName: makeField({ name: "firstName", type: "string", required: true }),
    };
    const row = ["Alice"];
    const columns = ["First Name"];

    const result = processRow(row, columns, spacedFields, "users", 1);

    expect(result.success).toBe(true);
    expect(result.data.firstName).toBe("Alice");
  });
});
