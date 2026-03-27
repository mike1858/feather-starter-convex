// @generated-start imports
import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";
// @generated-end imports

// @custom-start imports
// @custom-end imports

// @generated-start test-create
describe("create", () => {
  test("creates a Work Log with default values", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api["work-logs"].mutations.create, {
      body: "Test body content",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("work-logs").collect(),
    );
    expect(records).toHaveLength(1);
    expect(records[0].body).toBe("Test body content");
    expect(records[0].creatorId).toBe(userId);
  });

  test("creates a Work Log with all fields specified", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api["work-logs"].mutations.create, {
      body: "A detailed body",
      timeMinutes: 42,
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("work-logs").collect(),
    );
    expect(records).toHaveLength(1);
    expect(records[0].body).toBe("A detailed body");
    expect(records[0].timeMinutes).toBe(42);
  });

  test("does nothing when unauthenticated", async ({ testClient }) => {
    await testClient.mutation(api["work-logs"].mutations.create, {
      body: "Should not be created",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("work-logs").collect(),
    );
    expect(records).toHaveLength(0);
  });
});
// @generated-end test-create

// @generated-start test-update
describe("update", () => {
  test("does nothing when unauthenticated", async ({ testClient }) => {
    const recordId = await testClient.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", { name: "Seed" });
      return ctx.db.insert("work-logs", {
        body: "Seed content",
        timeMinutes: 0,
        creatorId: userId,
      });
    });

    await testClient.mutation(api["work-logs"].mutations.update, {
      workLogsId: recordId,
    });

    const record = await testClient.run(async (ctx: any) => ctx.db.get(recordId));
  });

  test("updates only specified fields", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api["work-logs"].mutations.create, {
      body: "Original body",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("work-logs").collect(),
    );
    const recordId = records[0]._id;

    await client.mutation(api["work-logs"].mutations.update, {
      workLogsId: recordId,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(recordId),
    );
  });

  test("throws when Work Log not found", async ({ client, testClient }) => {
    await client.mutation(api["work-logs"].mutations.create, {
      body: "Temporary",
    });
    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("work-logs").collect(),
    );
    const recordId = records[0]._id;
    await testClient.run(async (ctx: any) => ctx.db.delete(recordId));

    await expect(
      client.mutation(api["work-logs"].mutations.update, {
        workLogsId: recordId,
      }),
    ).rejects.toThrow("not found");
  });
});
// @generated-end test-update

// @generated-start test-remove
describe("remove", () => {
  test("does nothing when unauthenticated", async ({ testClient }) => {
    const recordId = await testClient.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", { name: "Seed" });
      return ctx.db.insert("work-logs", {
        body: "Seed content",
        timeMinutes: 0,
        creatorId: userId,
      });
    });

    await testClient.mutation(api["work-logs"].mutations.remove, { workLogsId: recordId });

    const record = await testClient.run(async (ctx: any) => ctx.db.get(recordId));
    expect(record).not.toBeNull();
  });

  test("deletes a Work Log", async ({ client, testClient }) => {
    await client.mutation(api["work-logs"].mutations.create, {
      body: "To delete",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("work-logs").collect(),
    );
    expect(records).toHaveLength(1);

    await client.mutation(api["work-logs"].mutations.remove, {
      workLogsId: records[0]._id,
    });

    const remaining = await testClient.run(async (ctx: any) =>
      ctx.db.query("work-logs").collect(),
    );
    expect(remaining).toHaveLength(0);
  });
});
// @generated-end test-remove



