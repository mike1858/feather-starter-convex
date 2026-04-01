import { describe, expect, it } from "vitest";
import type { ColumnInfo, SheetMetadata } from "./parser";
import {
  inferFieldType,
  inferEntityType,
  inferEntities,
  toFieldName,
  toEntityName,
  type InferredField,
} from "./type-inference";

/** Helper: create a ColumnInfo for testing */
function col(
  overrides: Partial<ColumnInfo> & { name: string },
): ColumnInfo {
  return {
    position: 0,
    detectedType: "string",
    sampleValues: [],
    uniqueCount: 0,
    emptyCount: 0,
    ...overrides,
  };
}

describe("inferFieldType", () => {
  it("detects email columns (80%+ email pattern match)", () => {
    const result = inferFieldType(
      col({
        name: "Contact Email",
        sampleValues: ["alice@example.com", "bob@test.com", "carol@foo.org"],
        uniqueCount: 3,
      }),
    );
    expect(result.type).toBe("email");
    expect(result.confidence).toBe(90);
  });

  it("detects URL columns", () => {
    const result = inferFieldType(
      col({
        name: "Website",
        sampleValues: [
          "https://example.com",
          "https://test.org",
          "http://foo.bar",
        ],
        uniqueCount: 3,
      }),
    );
    expect(result.type).toBe("url");
  });

  it("detects currency columns by pattern", () => {
    const result = inferFieldType(
      col({
        name: "Price Tag",
        sampleValues: ["$100.00", "$250.50", "$99.99"],
        uniqueCount: 3,
      }),
    );
    expect(result.type).toBe("currency");
    expect(result.confidence).toBe(85);
  });

  it("detects percentage columns by pattern", () => {
    const result = inferFieldType(
      col({
        name: "Score",
        sampleValues: ["85%", "92%", "78%"],
        uniqueCount: 3,
      }),
    );
    expect(result.type).toBe("percentage");
    expect(result.confidence).toBe(85);
  });

  it("detects low-cardinality strings as enum with values", () => {
    const result = inferFieldType(
      col({
        name: "Status",
        sampleValues: ["Active", "Inactive", "Active", "Pending", "Active"],
        uniqueCount: 3,
      }),
    );
    expect(result.type).toBe("enum");
    expect(result.enumValues).toContain("Active");
    expect(result.enumValues).toContain("Inactive");
    expect(result.enumValues).toContain("Pending");
  });

  it("detects long strings as text (avg > 100 chars)", () => {
    const longStr = "A".repeat(150);
    const result = inferFieldType(
      col({
        name: "Description",
        sampleValues: [longStr, longStr],
        uniqueCount: 50,
      }),
    );
    expect(result.type).toBe("text");
    expect(result.max).toBe(5000);
  });

  it("maps number detectedType to number", () => {
    const result = inferFieldType(
      col({
        name: "Quantity",
        detectedType: "number",
        sampleValues: [10, 20, 30],
        uniqueCount: 3,
      }),
    );
    expect(result.type).toBe("number");
    expect(result.confidence).toBe(90);
  });

  it("maps boolean detectedType to boolean", () => {
    const result = inferFieldType(
      col({
        name: "Is Active",
        detectedType: "boolean",
        sampleValues: [true, false, true],
        uniqueCount: 2,
      }),
    );
    expect(result.type).toBe("boolean");
    expect(result.confidence).toBe(95);
  });

  it("maps date detectedType to date", () => {
    const result = inferFieldType(
      col({
        name: "Hire Date",
        detectedType: "date",
        sampleValues: [new Date("2024-01-01"), new Date("2024-06-15")],
        uniqueCount: 2,
      }),
    );
    expect(result.type).toBe("date");
    expect(result.confidence).toBe(90);
  });

  it("sets required=true when emptyCount is 0", () => {
    const result = inferFieldType(
      col({
        name: "Title",
        sampleValues: ["A", "B", "C"],
        uniqueCount: 50,
        emptyCount: 0,
      }),
    );
    expect(result.required).toBe(true);
  });

  it("sets required=false when emptyCount > 0", () => {
    const result = inferFieldType(
      col({
        name: "Title",
        sampleValues: ["A", "B"],
        uniqueCount: 50,
        emptyCount: 1,
      }),
    );
    expect(result.required).toBe(false);
  });

  it("detects currency by number column name hint (price)", () => {
    const result = inferFieldType(
      col({
        name: "Unit Price",
        detectedType: "number",
        sampleValues: [9.99, 19.99, 29.99],
        uniqueCount: 3,
      }),
    );
    expect(result.type).toBe("currency");
  });

  it("detects percentage by number column name hint (rate)", () => {
    const result = inferFieldType(
      col({
        name: "Tax Rate",
        detectedType: "number",
        sampleValues: [0.08, 0.1, 0.15],
        uniqueCount: 3,
      }),
    );
    expect(result.type).toBe("percentage");
  });

  it("falls back to string with default confidence for empty detectedType", () => {
    const result = inferFieldType(
      col({
        name: "Unknown",
        detectedType: "empty",
        sampleValues: [],
        uniqueCount: 0,
      }),
    );
    expect(result.type).toBe("string");
    expect(result.confidence).toBe(50);
  });

  it("defaults to string for high-cardinality short strings", () => {
    const result = inferFieldType(
      col({
        name: "Title",
        sampleValues: ["Title A", "Title B", "Title C"],
        uniqueCount: 50,
      }),
    );
    expect(result.type).toBe("string");
    expect(result.max).toBeLessThanOrEqual(500);
  });
});

describe("inferEntityType", () => {
  it("classifies transaction (date + currency)", () => {
    const fields: Record<string, InferredField> = {
      date: { name: "date", type: "date", required: true, confidence: 90 },
      amount: {
        name: "amount",
        type: "currency",
        required: true,
        confidence: 85,
      },
      description: {
        name: "description",
        type: "string",
        required: false,
        confidence: 75,
      },
    };
    const result = inferEntityType(fields);
    expect(result.entityType).toBe("transaction");
    expect(result.confidence).toBe(85);
  });

  it("classifies lookup (few fields, mostly enum)", () => {
    const fields: Record<string, InferredField> = {
      code: { name: "code", type: "string", required: true, confidence: 75 },
      status: {
        name: "status",
        type: "enum",
        required: true,
        confidence: 80,
        enumValues: ["active", "inactive"],
      },
    };
    const result = inferEntityType(fields);
    expect(result.entityType).toBe("lookup");
  });

  it("classifies master (has email)", () => {
    const fields: Record<string, InferredField> = {
      contactEmail: {
        name: "contactEmail",
        type: "email",
        required: true,
        confidence: 90,
      },
      phone: {
        name: "phone",
        type: "string",
        required: false,
        confidence: 75,
      },
      address: {
        name: "address",
        type: "text",
        required: false,
        confidence: 85,
      },
      status: {
        name: "status",
        type: "enum",
        required: true,
        confidence: 80,
        enumValues: ["active"],
      },
      role: {
        name: "role",
        type: "string",
        required: false,
        confidence: 75,
      },
    };
    const result = inferEntityType(fields);
    expect(result.entityType).toBe("master");
  });

  it("classifies master (has name field)", () => {
    const fields: Record<string, InferredField> = {
      firstName: {
        name: "firstName",
        type: "string",
        required: true,
        confidence: 75,
      },
      lastName: {
        name: "lastName",
        type: "string",
        required: true,
        confidence: 75,
      },
      age: { name: "age", type: "number", required: false, confidence: 90 },
      status: {
        name: "status",
        type: "enum",
        required: true,
        confidence: 80,
        enumValues: ["active"],
      },
      role: {
        name: "role",
        type: "string",
        required: false,
        confidence: 75,
      },
    };
    const result = inferEntityType(fields);
    expect(result.entityType).toBe("master");
  });

  it("returns unknown for ambiguous entities", () => {
    const fields: Record<string, InferredField> = {
      value1: {
        name: "value1",
        type: "number",
        required: true,
        confidence: 90,
      },
      value2: {
        name: "value2",
        type: "number",
        required: false,
        confidence: 90,
      },
      value3: {
        name: "value3",
        type: "string",
        required: false,
        confidence: 75,
      },
      value4: {
        name: "value4",
        type: "boolean",
        required: false,
        confidence: 95,
      },
      value5: {
        name: "value5",
        type: "string",
        required: false,
        confidence: 75,
      },
    };
    const result = inferEntityType(fields);
    expect(result.entityType).toBe("unknown");
    expect(result.confidence).toBe(50);
  });
});

describe("inferEntities", () => {
  it("maps each non-empty sheet to an InferredEntity", () => {
    const sheets: SheetMetadata[] = [
      {
        name: "Employees",
        rowCount: 5,
        columnCount: 2,
        columns: [
          col({
            name: "Name",
            sampleValues: ["Alice", "Bob"],
            uniqueCount: 50,
          }),
          col({
            name: "Email",
            position: 1,
            sampleValues: ["a@test.com", "b@test.com"],
            uniqueCount: 50,
          }),
        ],
        sampleRows: [],
      },
    ];

    const result = inferEntities(sheets);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("employees");
    expect(result[0].sourceSheet).toBe("Employees");
    expect(Object.keys(result[0].fields)).toContain("email");
  });

  it("skips empty sheets", () => {
    const sheets: SheetMetadata[] = [
      {
        name: "Empty",
        rowCount: 0,
        columnCount: 0,
        columns: [],
        sampleRows: [],
      },
    ];

    const result = inferEntities(sheets);
    expect(result).toHaveLength(0);
  });

  it("skips columns with empty names", () => {
    const sheets: SheetMetadata[] = [
      {
        name: "Data",
        rowCount: 5,
        columnCount: 2,
        columns: [
          col({ name: "Title", sampleValues: ["A"], uniqueCount: 50 }),
          col({ name: "", position: 1, sampleValues: ["B"], uniqueCount: 50 }),
        ],
        sampleRows: [],
      },
    ];

    const result = inferEntities(sheets);
    expect(Object.keys(result[0].fields)).toHaveLength(1);
    expect(Object.keys(result[0].fields)).toContain("title");
  });
});

describe("toFieldName", () => {
  it('converts "Hire Date" to "hireDate"', () => {
    expect(toFieldName("Hire Date")).toBe("hireDate");
  });

  it("handles special characters", () => {
    expect(toFieldName("Employee #")).toBe("employee");
  });

  it("lowercases first character", () => {
    expect(toFieldName("Name")).toBe("name");
  });
});

describe("toEntityName", () => {
  it('converts "Employee Records" to "employee-records"', () => {
    expect(toEntityName("Employee Records")).toBe("employee-records");
  });

  it("handles special characters", () => {
    expect(toEntityName("Data (2024)")).toBe("data-2024");
  });
});
