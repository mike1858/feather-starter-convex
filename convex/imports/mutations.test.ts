// Test Matrix: imports mutations
// | # | Mutation       | State                    | What to verify                                      |
// |---|----------------|--------------------------|-----------------------------------------------------|
// | 1 | create         | valid                    | returns import ID, status=draft, userId set          |
// | 2 | create         | with optional fields     | sheetMetadata and fileStorageId persisted            |
// | 3 | create         | unauthenticated          | throws "Not authenticated"                          |
// | 4 | updateStatus   | to analyzing             | status changed                                      |
// | 5 | updateStatus   | to complete              | status changed, completedAt set                     |
// | 6 | updateStatus   | wrong owner              | throws "Import not found"                           |
// | 7 | updateStatus   | unauthenticated          | throws "Not authenticated"                          |
// | 8 | saveAnalysis   | valid                    | analysisResult stored, status=confirming             |
// | 9 | saveAnalysis   | wrong owner              | throws "Import not found"                           |
// |10 | saveAnalysis   | unauthenticated          | throws "Not authenticated"                          |
// |11 | confirmSchema  | valid                    | confirmedSchema stored, status=generating            |
// |12 | confirmSchema  | wrong owner              | throws "Import not found"                           |
// |13 | confirmSchema  | unauthenticated          | throws "Not authenticated"                          |
// |14 | saveImportStats| valid                    | importStats stored, status=complete, completedAt set |
// |15 | saveImportStats| wrong owner              | throws "Import not found"                           |
// |16 | saveImportStats| unauthenticated          | throws "Not authenticated"                          |
// |17 | saveErrors     | valid batch              | errors inserted into importErrors table             |
// |18 | saveErrors     | unauthenticated          | throws "Not authenticated"                          |
// |19 | saveErrors     | empty array              | no errors inserted                                  |
// |20 | remove         | existing import          | import deleted                                      |
// |21 | remove         | cascades errors          | associated importErrors deleted                     |
// |22 | remove         | cascades mappings        | associated schemaMappings deleted                   |
// |23 | remove         | wrong owner              | throws "Import not found"                           |
// |24 | remove         | unauthenticated          | throws "Not authenticated"                          |

import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

describe("create", () => {
  test("creates import with draft status and returns ID", async ({
    client,
    userId,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });

    expect(importId).toBeDefined();
    const imports = await testClient.run(async (ctx: any) =>
      ctx.db.query("imports").collect(),
    );
    expect(imports).toHaveLength(1);
    expect(imports[0].fileName).toBe("test.xlsx");
    expect(imports[0].status).toBe("draft");
    expect(imports[0].userId).toBe(userId);
  });

  test("persists optional sheetMetadata and fileStorageId", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.imports.mutations.create, {
      fileName: "data.xlsx",
      fileStorageId: "storage-123",
      sheetMetadata: '{"sheets":["Sheet1"]}',
    });

    const imports = await testClient.run(async (ctx: any) =>
      ctx.db.query("imports").collect(),
    );
    expect(imports[0].fileStorageId).toBe("storage-123");
    expect(imports[0].sheetMetadata).toBe('{"sheets":["Sheet1"]}');
  });

  test("throws for unauthenticated user", async ({ testClient }) => {
    await expect(
      testClient.mutation(api.imports.mutations.create, {
        fileName: "test.xlsx",
      }),
    ).rejects.toThrow("Not authenticated");
  });
});

describe("updateStatus", () => {
  test("transitions status correctly", async ({ client, testClient }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });

    await client.mutation(api.imports.mutations.updateStatus, {
      importId,
      status: "analyzing",
    });

    const imports = await testClient.run(async (ctx: any) =>
      ctx.db.query("imports").collect(),
    );
    expect(imports[0].status).toBe("analyzing");
  });

  test("sets completedAt when status is complete", async ({
    client,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });

    await client.mutation(api.imports.mutations.updateStatus, {
      importId,
      status: "complete",
    });

    const imports = await testClient.run(async (ctx: any) =>
      ctx.db.query("imports").collect(),
    );
    expect(imports[0].status).toBe("complete");
    expect(imports[0].completedAt).toBeTypeOf("number");
  });

  test("throws for wrong owner", async ({ client, testClient }) => {
    const otherUserId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "Other" }),
    );
    const importId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("imports", {
        userId: otherUserId,
        fileName: "other.xlsx",
        status: "draft",
      }),
    );

    await expect(
      client.mutation(api.imports.mutations.updateStatus, {
        importId,
        status: "analyzing",
      }),
    ).rejects.toThrow("Import not found");
  });

  test("throws for unauthenticated user", async ({ testClient }) => {
    // Create a fake import ID — won't reach DB lookup
    const fakeId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("imports", {
        userId: await ctx.db.insert("users", { name: "tmp" }),
        fileName: "test.xlsx",
        status: "draft",
      }),
    );

    await expect(
      testClient.mutation(api.imports.mutations.updateStatus, {
        importId: fakeId,
        status: "analyzing",
      }),
    ).rejects.toThrow("Not authenticated");
  });
});

describe("saveAnalysis", () => {
  test("stores analysis result and sets status to confirming", async ({
    client,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });

    await client.mutation(api.imports.mutations.saveAnalysis, {
      importId,
      analysisResult: '{"entities":[]}',
    });

    const imports = await testClient.run(async (ctx: any) =>
      ctx.db.query("imports").collect(),
    );
    expect(imports[0].analysisResult).toBe('{"entities":[]}');
    expect(imports[0].status).toBe("confirming");
  });

  test("throws for wrong owner", async ({ client, testClient }) => {
    const otherUserId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "Other" }),
    );
    const importId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("imports", {
        userId: otherUserId,
        fileName: "other.xlsx",
        status: "draft",
      }),
    );

    await expect(
      client.mutation(api.imports.mutations.saveAnalysis, {
        importId,
        analysisResult: "{}",
      }),
    ).rejects.toThrow("Import not found");
  });

  test("throws for unauthenticated user", async ({ testClient }) => {
    const fakeId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("imports", {
        userId: await ctx.db.insert("users", { name: "tmp" }),
        fileName: "test.xlsx",
        status: "draft",
      }),
    );

    await expect(
      testClient.mutation(api.imports.mutations.saveAnalysis, {
        importId: fakeId,
        analysisResult: "{}",
      }),
    ).rejects.toThrow("Not authenticated");
  });
});

describe("confirmSchema", () => {
  test("stores confirmed schema and sets status to generating", async ({
    client,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });

    await client.mutation(api.imports.mutations.confirmSchema, {
      importId,
      confirmedSchema: '{"tables":[]}',
    });

    const imports = await testClient.run(async (ctx: any) =>
      ctx.db.query("imports").collect(),
    );
    expect(imports[0].confirmedSchema).toBe('{"tables":[]}');
    expect(imports[0].status).toBe("generating");
  });

  test("throws for wrong owner", async ({ client, testClient }) => {
    const otherUserId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "Other" }),
    );
    const importId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("imports", {
        userId: otherUserId,
        fileName: "other.xlsx",
        status: "draft",
      }),
    );

    await expect(
      client.mutation(api.imports.mutations.confirmSchema, {
        importId,
        confirmedSchema: "{}",
      }),
    ).rejects.toThrow("Import not found");
  });

  test("throws for unauthenticated user", async ({ testClient }) => {
    const fakeId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("imports", {
        userId: await ctx.db.insert("users", { name: "tmp" }),
        fileName: "test.xlsx",
        status: "draft",
      }),
    );

    await expect(
      testClient.mutation(api.imports.mutations.confirmSchema, {
        importId: fakeId,
        confirmedSchema: "{}",
      }),
    ).rejects.toThrow("Not authenticated");
  });
});

describe("saveImportStats", () => {
  test("stores stats and sets status to complete with completedAt", async ({
    client,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });

    await client.mutation(api.imports.mutations.saveImportStats, {
      importId,
      importStats: '{"imported":100,"skipped":5}',
    });

    const imports = await testClient.run(async (ctx: any) =>
      ctx.db.query("imports").collect(),
    );
    expect(imports[0].importStats).toBe('{"imported":100,"skipped":5}');
    expect(imports[0].status).toBe("complete");
    expect(imports[0].completedAt).toBeTypeOf("number");
  });

  test("throws for wrong owner", async ({ client, testClient }) => {
    const otherUserId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "Other" }),
    );
    const importId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("imports", {
        userId: otherUserId,
        fileName: "other.xlsx",
        status: "draft",
      }),
    );

    await expect(
      client.mutation(api.imports.mutations.saveImportStats, {
        importId,
        importStats: "{}",
      }),
    ).rejects.toThrow("Import not found");
  });

  test("throws for unauthenticated user", async ({ testClient }) => {
    const fakeId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("imports", {
        userId: await ctx.db.insert("users", { name: "tmp" }),
        fileName: "test.xlsx",
        status: "draft",
      }),
    );

    await expect(
      testClient.mutation(api.imports.mutations.saveImportStats, {
        importId: fakeId,
        importStats: "{}",
      }),
    ).rejects.toThrow("Not authenticated");
  });
});

describe("saveErrors", () => {
  test("inserts errors into importErrors table", async ({
    client,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });

    await client.mutation(api.imports.mutations.saveErrors, {
      importId,
      errors: [
        {
          entityName: "employees",
          rowNumber: 1,
          severity: "green" as const,
          column: "salary",
          originalValue: "$50,000",
          fixedValue: "50000",
          errorMessage: 'Auto-converted "$50,000" to 50000',
        },
        {
          entityName: "employees",
          rowNumber: 2,
          severity: "red" as const,
          column: "email",
          errorMessage: "Invalid email format",
        },
      ],
    });

    const errors = await testClient.run(async (ctx: any) =>
      ctx.db.query("importErrors").collect(),
    );
    expect(errors).toHaveLength(2);
    expect(errors[0].severity).toBe("green");
    expect(errors[0].originalValue).toBe("$50,000");
    expect(errors[1].severity).toBe("red");
    expect(errors[1].originalValue).toBeUndefined();
  });

  test("throws for unauthenticated user", async ({ testClient }) => {
    const fakeId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("imports", {
        userId: await ctx.db.insert("users", { name: "tmp" }),
        fileName: "test.xlsx",
        status: "draft",
      }),
    );

    await expect(
      testClient.mutation(api.imports.mutations.saveErrors, {
        importId: fakeId,
        errors: [],
      }),
    ).rejects.toThrow("Not authenticated");
  });

  test("handles empty errors array", async ({ client, testClient }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });

    await client.mutation(api.imports.mutations.saveErrors, {
      importId,
      errors: [],
    });

    const errors = await testClient.run(async (ctx: any) =>
      ctx.db.query("importErrors").collect(),
    );
    expect(errors).toHaveLength(0);
  });
});

describe("remove", () => {
  test("deletes import document", async ({ client, testClient }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });

    await client.mutation(api.imports.mutations.remove, { importId });

    const imports = await testClient.run(async (ctx: any) =>
      ctx.db.query("imports").collect(),
    );
    expect(imports).toHaveLength(0);
  });

  test("cascades delete to importErrors", async ({
    client,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });

    // Insert error directly
    await testClient.run(async (ctx: any) =>
      ctx.db.insert("importErrors", {
        importId,
        entityName: "tasks",
        rowNumber: 1,
        severity: "red",
        column: "title",
        errorMessage: "Missing value",
      }),
    );

    await client.mutation(api.imports.mutations.remove, { importId });

    const errors = await testClient.run(async (ctx: any) =>
      ctx.db.query("importErrors").collect(),
    );
    expect(errors).toHaveLength(0);
  });

  test("cascades delete to schemaMappings", async ({
    client,
    userId,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });

    await testClient.run(async (ctx: any) =>
      ctx.db.insert("schemaMappings", {
        userId,
        importId,
        entityName: "tasks",
        systemFieldId: "title",
        systemFieldName: "Title",
        excelColumnName: "Task Name",
        excelColumnPosition: 0,
        excelSheetName: "Sheet1",
        importHistory: "[]",
      }),
    );

    await client.mutation(api.imports.mutations.remove, { importId });

    const mappings = await testClient.run(async (ctx: any) =>
      ctx.db.query("schemaMappings").collect(),
    );
    expect(mappings).toHaveLength(0);
  });

  test("throws for wrong owner", async ({ client, testClient }) => {
    const otherUserId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "Other" }),
    );
    const importId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("imports", {
        userId: otherUserId,
        fileName: "other.xlsx",
        status: "draft",
      }),
    );

    await expect(
      client.mutation(api.imports.mutations.remove, { importId }),
    ).rejects.toThrow("Import not found");
  });

  test("throws for unauthenticated user", async ({ testClient }) => {
    const fakeId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("imports", {
        userId: await ctx.db.insert("users", { name: "tmp" }),
        fileName: "test.xlsx",
        status: "draft",
      }),
    );

    await expect(
      testClient.mutation(api.imports.mutations.remove, {
        importId: fakeId,
      }),
    ).rejects.toThrow("Not authenticated");
  });
});
