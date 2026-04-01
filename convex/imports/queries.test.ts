// Test Matrix: imports/queries
// | # | Query | Condition        | What to verify                      |
// |---|-------|------------------|-------------------------------------|
// | 1 | list  | unauthenticated  | returns empty array                 |
// | 2 | list  | no imports       | returns empty array                 |
// | 3 | list  | with imports     | returns user's imports              |
// | 4 | list  | sort order       | newest first by _creationTime       |
// | 5 | list  | user isolation   | only returns own imports            |

import { expect, describe, test as baseTest } from "vitest";
import { test } from "@cvx/test.setup";
import { api } from "~/convex/_generated/api";

describe("imports.queries.list", () => {
  test("returns empty array when unauthenticated", async ({ testClient }) => {
    const result = await testClient.query(api.imports.queries.list, {});
    expect(result).toEqual([]);
  });

  test("returns empty array when no imports exist", async ({ client }) => {
    const result = await client.query(api.imports.queries.list, {});
    expect(result).toEqual([]);
  });

  test("returns user imports", async ({ client, testClient, userId }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("imports", {
        fileName: "data.xlsx",
        status: "complete",
        userId,
      });
    });

    const result = await client.query(api.imports.queries.list, {});
    expect(result).toHaveLength(1);
    expect(result[0].fileName).toBe("data.xlsx");
    expect(result[0].status).toBe("complete");
  });

  test("sorts imports newest first", async ({ client, testClient, userId }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("imports", {
        fileName: "first.xlsx",
        status: "complete",
        userId,
      });
    });

    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("imports", {
        fileName: "second.xlsx",
        status: "pending",
        userId,
      });
    });

    const result = await client.query(api.imports.queries.list, {});
    expect(result).toHaveLength(2);
    expect(result[0].fileName).toBe("second.xlsx");
    expect(result[1].fileName).toBe("first.xlsx");
  });

  test("only returns imports for authenticated user", async ({
    client,
    testClient,
    userId,
  }) => {
    // Insert import for current user
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("imports", {
        fileName: "mine.xlsx",
        status: "complete",
        userId,
      });
    });

    // Insert import for another user
    await testClient.run(async (ctx: any) => {
      const otherUser = await ctx.db.insert("users", { name: "Other" });
      await ctx.db.insert("imports", {
        fileName: "theirs.xlsx",
        status: "complete",
        userId: otherUser,
      });
    });

    const result = await client.query(api.imports.queries.list, {});
    expect(result).toHaveLength(1);
    expect(result[0].fileName).toBe("mine.xlsx");
  });
});
