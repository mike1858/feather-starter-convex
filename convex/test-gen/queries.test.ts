// @generated-start imports
import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";
// @generated-end imports

// @custom-start imports
// @custom-end imports

// @generated-start test-list
describe("list", () => {
  test("returns Test Items for authenticated user", async ({
    client,
    userId,
    testClient,
  }) => {
    // Create 2 records via the create mutation
    await client.mutation(api["test-gen"].mutations.create, {
      title: "Test Item 1",
    });
    await client.mutation(api["test-gen"].mutations.create, {
      title: "Test Item 2",
    });

    const records = await client.query(api["test-gen"].queries.list, {});
    expect(records).toHaveLength(2);
  });

  test("returns empty array when no Test Items", async ({
    client,
  }) => {
    const records = await client.query(api["test-gen"].queries.list, {});
    expect(records).toHaveLength(0);
  });

  test("returns empty when unauthenticated", async ({ testClient }) => {
    const records = await testClient.query(api["test-gen"].queries.list, {});
    expect(records).toEqual([]);
  });

  test("returns records sorted by position ascending", async ({
    client,
    userId,
    testClient,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("test-gen", {
        title: "Second",
        description: "Second content",
        status: "draft",
        priority: false,
        creatorId: userId,
        position: 200,
      });
      await ctx.db.insert("test-gen", {
        title: "First",
        description: "First content",
        status: "draft",
        priority: false,
        creatorId: userId,
        position: 100,
      });
    });

    const records = await client.query(api["test-gen"].queries.list, {});
    expect(records).toHaveLength(2);
    expect(records[0].title).toBe("First");
    expect(records[1].title).toBe("Second");
  });
});
// @generated-end test-list

// @generated-start test-get
describe("get", () => {
  test("returns a single Test Item", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api["test-gen"].mutations.create, {
      title: "Get test",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("test-gen").collect(),
    );

    const record = await client.query(api["test-gen"].queries.get, {
      id: records[0]._id,
    });
    expect(record).not.toBeNull();
    expect(record!.title).toBe("Get test");
  });

  test("returns null when unauthenticated", async ({ testClient }) => {
    const recordId = await testClient.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", { name: "Seed" });
      return ctx.db.insert("test-gen", {
        title: "Seed",
        description: "Seed content",
        status: "draft",
        priority: false,
        creatorId: userId,
        position: 1,
      });
    });

    const record = await testClient.query(api["test-gen"].queries.get, {
      id: recordId,
    });
    expect(record).toBeNull();
  });
});
// @generated-end test-get

