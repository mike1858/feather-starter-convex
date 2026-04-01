// Test Matrix: imports queries
// | # | Query      | State                       | What to verify                                   |
// |---|------------|-----------------------------|--------------------------------------------------|
// | 1 | get        | own import                  | returns full import document                     |
// | 2 | get        | other user's import         | returns null                                     |
// | 3 | get        | unauthenticated             | returns null                                     |
// | 4 | list       | multiple imports            | returns user's imports in descending order        |
// | 5 | list       | unauthenticated             | returns empty array                              |
// | 6 | getErrors  | all errors                  | returns all errors for import                    |
// | 7 | getErrors  | severity filter             | returns only matching severity                   |
// | 8 | getErrors  | wrong owner                 | returns empty array                              |
// | 9 | getErrors  | unauthenticated             | returns empty array                              |

import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

describe("get", () => {
  test("returns import for owner", async ({ client }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });

    const result = await client.query(api.imports.queries.get, { importId });
    expect(result).not.toBeNull();
    expect(result!.fileName).toBe("test.xlsx");
    expect(result!.status).toBe("draft");
  });

  test("returns null for other user's import", async ({
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

    const result = await client.query(api.imports.queries.get, { importId });
    expect(result).toBeNull();
  });

  test("returns null for unauthenticated user", async ({ testClient }) => {
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

    const result = await testClient.query(api.imports.queries.get, {
      importId,
    });
    expect(result).toBeNull();
  });
});

describe("list", () => {
  test("returns user's imports in descending order", async ({
    client,
    testClient: _testClient,
  }) => {
    await client.mutation(api.imports.mutations.create, {
      fileName: "first.xlsx",
    });
    await client.mutation(api.imports.mutations.create, {
      fileName: "second.xlsx",
    });

    const results = await client.query(api.imports.queries.list, {});
    expect(results).toHaveLength(2);
    // Descending by creation order — second created should be first
    expect(results[0].fileName).toBe("second.xlsx");
    expect(results[1].fileName).toBe("first.xlsx");
  });

  test("returns empty for unauthenticated user", async ({ testClient }) => {
    const results = await testClient.query(api.imports.queries.list, {});
    expect(results).toHaveLength(0);
  });
});

describe("getErrors", () => {
  test("returns all errors for an import", async ({
    client,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });

    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("importErrors", {
        importId,
        entityName: "tasks",
        rowNumber: 1,
        severity: "red",
        column: "title",
        errorMessage: "Missing value",
      });
      await ctx.db.insert("importErrors", {
        importId,
        entityName: "tasks",
        rowNumber: 2,
        severity: "yellow",
        column: "status",
        errorMessage: "Unknown status",
      });
    });

    const results = await client.query(api.imports.queries.getErrors, {
      importId,
    });
    expect(results).toHaveLength(2);
  });

  test("filters by severity when provided", async ({
    client,
    testClient,
  }) => {
    const importId = await client.mutation(api.imports.mutations.create, {
      fileName: "test.xlsx",
    });

    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("importErrors", {
        importId,
        entityName: "tasks",
        rowNumber: 1,
        severity: "red",
        column: "title",
        errorMessage: "Missing",
      });
      await ctx.db.insert("importErrors", {
        importId,
        entityName: "tasks",
        rowNumber: 2,
        severity: "yellow",
        column: "status",
        errorMessage: "Unknown",
      });
      await ctx.db.insert("importErrors", {
        importId,
        entityName: "tasks",
        rowNumber: 3,
        severity: "green",
        column: "priority",
        errorMessage: "Auto-fixed",
      });
    });

    const redErrors = await client.query(api.imports.queries.getErrors, {
      importId,
      severity: "red",
    });
    expect(redErrors).toHaveLength(1);
    expect(redErrors[0].severity).toBe("red");
  });

  test("returns empty for other user's import", async ({
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

    const results = await client.query(api.imports.queries.getErrors, {
      importId,
    });
    expect(results).toHaveLength(0);
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

    const results = await testClient.query(api.imports.queries.getErrors, {
      importId,
    });
    expect(results).toHaveLength(0);
  });
});
