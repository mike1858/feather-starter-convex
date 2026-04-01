// Test Matrix: schemaMappings mutations
// | # | Mutation       | State                 | What to verify                                      |
// |---|----------------|-----------------------|-----------------------------------------------------|
// | 1 | saveMappings   | single mapping        | creates mapping with empty importHistory             |
// | 2 | saveMappings   | multiple mappings     | creates all mappings, returns array of IDs           |
// | 3 | saveMappings   | wrong owner           | throws "Import not found"                           |
// | 4 | saveMappings   | unauthenticated       | throws "Not authenticated"                          |
// | 5 | updateMapping  | systemFieldName       | field updated                                       |
// | 6 | updateMapping  | excelColumnName       | column renamed, history entry appended              |
// | 7 | updateMapping  | position and fingerprint | both fields updated                              |
// | 8 | updateMapping  | wrong owner           | throws "Mapping not found"                          |
// | 9 | updateMapping  | unauthenticated       | throws "Not authenticated"                          |

import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

describe("saveMappings", () => {
  test("creates mapping with empty importHistory", async ({
    client,
    userId,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });

    const ids = await client.mutation(
      api.schemaMappings.mutations.saveMappings,
      {
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
      },
    );

    expect(ids).toHaveLength(1);
    const mappings = await testClient.run(async (ctx: any) =>
      ctx.db.query("schemaMappings").collect(),
    );
    expect(mappings).toHaveLength(1);
    expect(mappings[0].entityName).toBe("tasks");
    expect(mappings[0].importHistory).toBe("[]");
    expect(mappings[0].userId).toBe(userId);
  });

  test("creates multiple mappings and returns array of IDs", async ({
    client,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });

    const ids = await client.mutation(
      api.schemaMappings.mutations.saveMappings,
      {
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
      },
    );

    expect(ids).toHaveLength(2);
    const mappings = await testClient.run(async (ctx: any) =>
      ctx.db.query("schemaMappings").collect(),
    );
    expect(mappings).toHaveLength(2);
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
      client.mutation(api.schemaMappings.mutations.saveMappings, {
        importId,
        mappings: [
          {
            entityName: "tasks",
            systemFieldId: "title",
            systemFieldName: "Title",
            excelColumnName: "Name",
            excelColumnPosition: 0,
            excelSheetName: "Sheet1",
          },
        ],
      }),
    ).rejects.toThrow("Import not found");
  });

  test("throws for unauthenticated user", async ({ testClient }) => {
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

    await expect(
      testClient.mutation(api.schemaMappings.mutations.saveMappings, {
        importId,
        mappings: [],
      }),
    ).rejects.toThrow("Not authenticated");
  });
});

describe("updateMapping", () => {
  test("updates systemFieldName", async ({
    client,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });
    const [mappingId] = await client.mutation(
      api.schemaMappings.mutations.saveMappings,
      {
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
      },
    );

    await client.mutation(api.schemaMappings.mutations.updateMapping, {
      mappingId,
      systemFieldName: "Name",
    });

    const mappings = await testClient.run(async (ctx: any) =>
      ctx.db.query("schemaMappings").collect(),
    );
    expect(mappings[0].systemFieldName).toBe("Name");
  });

  test("tracks column rename in importHistory", async ({
    client,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });
    const [mappingId] = await client.mutation(
      api.schemaMappings.mutations.saveMappings,
      {
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
      },
    );

    await client.mutation(api.schemaMappings.mutations.updateMapping, {
      mappingId,
      excelColumnName: "Item Name",
    });

    const mappings = await testClient.run(async (ctx: any) =>
      ctx.db.query("schemaMappings").collect(),
    );
    expect(mappings[0].excelColumnName).toBe("Item Name");
    const history = JSON.parse(mappings[0].importHistory);
    expect(history).toHaveLength(1);
    expect(history[0].oldName).toBe("Task Name");
    expect(history[0].newName).toBe("Item Name");
    expect(history[0].date).toBeDefined();
  });

  test("updates position and dataFingerprint", async ({
    client,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });
    const [mappingId] = await client.mutation(
      api.schemaMappings.mutations.saveMappings,
      {
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
      },
    );

    await client.mutation(api.schemaMappings.mutations.updateMapping, {
      mappingId,
      excelColumnPosition: 3,
      dataFingerprint: "abc123",
    });

    const mappings = await testClient.run(async (ctx: any) =>
      ctx.db.query("schemaMappings").collect(),
    );
    expect(mappings[0].excelColumnPosition).toBe(3);
    expect(mappings[0].dataFingerprint).toBe("abc123");
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
    const mappingId = await testClient.run(async (ctx: any) =>
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

    await expect(
      client.mutation(api.schemaMappings.mutations.updateMapping, {
        mappingId,
        systemFieldName: "Hacked",
      }),
    ).rejects.toThrow("Mapping not found");
  });

  test("throws for unauthenticated user", async ({ testClient }) => {
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
    const mappingId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("schemaMappings", {
        userId,
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

    await expect(
      testClient.mutation(api.schemaMappings.mutations.updateMapping, {
        mappingId,
        systemFieldName: "Hacked",
      }),
    ).rejects.toThrow("Not authenticated");
  });
});
