// Test Matrix: schemaMappings queries
// | # | Query                 | State                   | What to verify                                 |
// |---|----------------------|-------------------------|------------------------------------------------|
// | 1 | getMappingsForEntity | own mappings            | returns filtered by entity and user             |
// | 2 | getMappingsForEntity | other user's mappings   | not returned                                   |
// | 3 | getMappingsForEntity | unauthenticated         | returns empty array                            |
// | 4 | getMappingsForImport | own import              | returns all mappings for import                 |
// | 5 | getMappingsForImport | unauthenticated         | returns empty array                            |
// | 6 | findMatchingMappings | matching sheet name     | returns matching mappings                       |
// | 7 | findMatchingMappings | matching column name    | returns matching mappings                       |
// | 8 | findMatchingMappings | no match                | returns empty array                            |
// | 9 | findMatchingMappings | unauthenticated         | returns empty array                            |

import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

describe("getMappingsForEntity", () => {
  test("returns mappings filtered by entity name and user", async ({
    client,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });
    await client.mutation(api.schemaMappings.mutations.saveMappings, {
      importId,
      mappings: [
        {
          entityName: "tasks",
          systemFieldId: "title",
          systemFieldName: "Title",
          excelColumnName: "Task Name",
          excelColumnPosition: 0,
          excelSheetName: "Sheet1",
        },
        {
          entityName: "projects",
          systemFieldId: "name",
          systemFieldName: "Name",
          excelColumnName: "Project Name",
          excelColumnPosition: 1,
          excelSheetName: "Sheet2",
        },
      ],
    });

    const taskMappings = await client.query(
      api.schemaMappings.queries.getMappingsForEntity,
      { entityName: "tasks" },
    );
    expect(taskMappings).toHaveLength(1);
    expect(taskMappings[0].systemFieldId).toBe("title");
  });

  test("does not return other user's mappings", async ({
    client,
    testClient,
  }) => {
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
    await testClient.run(async (ctx: any) =>
      ctx.db.insert("schemaMappings", {
        userId: otherUserId,
        importId,
        entityName: "tasks",
        systemFieldId: "title",
        systemFieldName: "Title",
        excelColumnName: "Name",
        excelColumnPosition: 0,
        excelSheetName: "Sheet1",
        importHistory: "[]",
      }),
    );

    const results = await client.query(
      api.schemaMappings.queries.getMappingsForEntity,
      { entityName: "tasks" },
    );
    expect(results).toHaveLength(0);
  });

  test("returns empty for unauthenticated user", async ({ testClient }) => {
    const results = await testClient.query(
      api.schemaMappings.queries.getMappingsForEntity,
      { entityName: "tasks" },
    );
    expect(results).toHaveLength(0);
  });
});

describe("getMappingsForImport", () => {
  test("returns all mappings for a specific import", async ({
    client,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });
    await client.mutation(api.schemaMappings.mutations.saveMappings, {
      importId,
      mappings: [
        {
          entityName: "tasks",
          systemFieldId: "title",
          systemFieldName: "Title",
          excelColumnName: "Task Name",
          excelColumnPosition: 0,
          excelSheetName: "Sheet1",
        },
        {
          entityName: "tasks",
          systemFieldId: "status",
          systemFieldName: "Status",
          excelColumnName: "Task Status",
          excelColumnPosition: 1,
          excelSheetName: "Sheet1",
        },
      ],
    });

    const results = await client.query(
      api.schemaMappings.queries.getMappingsForImport,
      { importId },
    );
    expect(results).toHaveLength(2);
  });

  test("returns empty for unauthenticated user", async ({ testClient }) => {
    const userId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "tmp" }),
    );
    const importId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("imports", {
        userId,
        fileName: "test.xlsx",
        status: "draft",
      }),
    );

    const results = await testClient.query(
      api.schemaMappings.queries.getMappingsForImport,
      { importId },
    );
    expect(results).toHaveLength(0);
  });
});

describe("findMatchingMappings", () => {
  test("returns mappings matching sheet names", async ({
    client,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });
    await client.mutation(api.schemaMappings.mutations.saveMappings, {
      importId,
      mappings: [
        {
          entityName: "tasks",
          systemFieldId: "title",
          systemFieldName: "Title",
          excelColumnName: "Task Name",
          excelColumnPosition: 0,
          excelSheetName: "Tasks",
        },
      ],
    });

    const results = await client.query(
      api.schemaMappings.queries.findMatchingMappings,
      { sheetNames: ["Tasks"], columnNames: [] },
    );
    expect(results).toHaveLength(1);
  });

  test("returns mappings matching column names", async ({
    client,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });
    await client.mutation(api.schemaMappings.mutations.saveMappings, {
      importId,
      mappings: [
        {
          entityName: "tasks",
          systemFieldId: "title",
          systemFieldName: "Title",
          excelColumnName: "Task Name",
          excelColumnPosition: 0,
          excelSheetName: "Sheet1",
        },
      ],
    });

    const results = await client.query(
      api.schemaMappings.queries.findMatchingMappings,
      { sheetNames: [], columnNames: ["Task Name"] },
    );
    expect(results).toHaveLength(1);
  });

  test("returns empty for no match", async ({ client }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });
    await client.mutation(api.schemaMappings.mutations.saveMappings, {
      importId,
      mappings: [
        {
          entityName: "tasks",
          systemFieldId: "title",
          systemFieldName: "Title",
          excelColumnName: "Task Name",
          excelColumnPosition: 0,
          excelSheetName: "Sheet1",
        },
      ],
    });

    const results = await client.query(
      api.schemaMappings.queries.findMatchingMappings,
      { sheetNames: ["NoMatch"], columnNames: ["NoMatch"] },
    );
    expect(results).toHaveLength(0);
  });

  test("returns empty for unauthenticated user", async ({ testClient }) => {
    const results = await testClient.query(
      api.schemaMappings.queries.findMatchingMappings,
      { sheetNames: ["Sheet1"], columnNames: ["Name"] },
    );
    expect(results).toHaveLength(0);
  });
});
