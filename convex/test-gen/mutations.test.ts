// @generated-start imports
import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";
// @generated-end imports

// @custom-start imports
// @custom-end imports

// @generated-start test-create
describe("create", () => {
  test("creates a Test Item with default values", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api["test-gen"].mutations.create, {
      title: "Test title",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("test-gen").collect(),
    );
    expect(records).toHaveLength(1);
    expect(records[0].title).toBe("Test title");
    expect(records[0].status).toBe("draft");
    expect(records[0].priority).toBe(false);
    expect(records[0].creatorId).toBe(userId);
    expect(records[0].position).toBeTypeOf("number");
  });

  test("creates a Test Item with all fields specified", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api["test-gen"].mutations.create, {
      title: "Full title",
      description: "A detailed description",
      priority: true,
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("test-gen").collect(),
    );
    expect(records).toHaveLength(1);
    expect(records[0].title).toBe("Full title");
    expect(records[0].description).toBe("A detailed description");
    expect(records[0].priority).toBe(true);
  });

  test("does nothing when unauthenticated", async ({ testClient }) => {
    await testClient.mutation(api["test-gen"].mutations.create, {
      title: "Should not be created",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("test-gen").collect(),
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
      return ctx.db.insert("test-gen", {
        title: "Seed",
        description: "Seed content",
        status: "draft",
        priority: false,
        creatorId: userId,
        position: 1,
      });
    });

    await testClient.mutation(api["test-gen"].mutations.update, {
      testGenId: recordId,
      title: "Should not change",
    });

    const record = await testClient.run(async (ctx: any) => ctx.db.get(recordId));
    expect(record.title).toBe("Seed");
  });

  test("updates only specified fields", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api["test-gen"].mutations.create, {
      title: "Original title",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("test-gen").collect(),
    );
    const recordId = records[0]._id;

    await client.mutation(api["test-gen"].mutations.update, {
      testGenId: recordId,
      title: "Updated title",
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(recordId),
    );
    expect(updated.title).toBe("Updated title");
  });

  test("throws when Test Item not found", async ({ client, testClient }) => {
    await client.mutation(api["test-gen"].mutations.create, {
      title: "Temporary",
    });
    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("test-gen").collect(),
    );
    const recordId = records[0]._id;
    await testClient.run(async (ctx: any) => ctx.db.delete(recordId));

    await expect(
      client.mutation(api["test-gen"].mutations.update, {
        testGenId: recordId,
        title: "Nope",
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
      return ctx.db.insert("test-gen", {
        title: "Seed",
        description: "Seed content",
        status: "draft",
        priority: false,
        creatorId: userId,
        position: 1,
      });
    });

    await testClient.mutation(api["test-gen"].mutations.remove, { testGenId: recordId });

    const record = await testClient.run(async (ctx: any) => ctx.db.get(recordId));
    expect(record).not.toBeNull();
  });

  test("deletes a Test Item", async ({ client, testClient }) => {
    await client.mutation(api["test-gen"].mutations.create, {
      title: "To delete",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("test-gen").collect(),
    );
    expect(records).toHaveLength(1);

    await client.mutation(api["test-gen"].mutations.remove, {
      testGenId: records[0]._id,
    });

    const remaining = await testClient.run(async (ctx: any) =>
      ctx.db.query("test-gen").collect(),
    );
    expect(remaining).toHaveLength(0);
  });
});
// @generated-end test-remove

// @generated-start test-updateStatus
describe("updateStatus", () => {
  test("does nothing when unauthenticated", async ({ testClient }) => {
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

    await testClient.mutation(api["test-gen"].mutations.updateStatus, {
      testGenId: recordId,
      status: "active",
    });

    const record = await testClient.run(async (ctx: any) => ctx.db.get(recordId));
    expect(record.status).toBe("draft");
  });

  test("throws when Test Item not found", async ({ client, testClient }) => {
    await client.mutation(api["test-gen"].mutations.create, {
      title: "Temp",
    });
    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("test-gen").collect(),
    );
    const recordId = records[0]._id;
    await testClient.run(async (ctx: any) => ctx.db.delete(recordId));

    await expect(
      client.mutation(api["test-gen"].mutations.updateStatus, {
        testGenId: recordId,
        status: "active",
      }),
    ).rejects.toThrow("not found");
  });

  test("advances draft to active", async ({ client, testClient }) => {
    await client.mutation(api["test-gen"].mutations.create, {
      title: "Status test",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("test-gen").collect(),
    );

    await client.mutation(api["test-gen"].mutations.updateStatus, {
      testGenId: records[0]._id,
      status: "active",
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(records[0]._id),
    );
    expect(updated.status).toBe("active");
  });
  test("advances active to completed", async ({ client, testClient }) => {
    await client.mutation(api["test-gen"].mutations.create, {
      title: "Status test",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("test-gen").collect(),
    );

    await client.mutation(api["test-gen"].mutations.updateStatus, {
      testGenId: records[0]._id,
      status: "completed",
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(records[0]._id),
    );
    expect(updated.status).toBe("completed");
  });

  test("rejects invalid transition", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api["test-gen"].mutations.create, {
      title: "Status test",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("test-gen").collect(),
    );

    await expect(
      client.mutation(api["test-gen"].mutations.updateStatus, {
        testGenId: records[0]._id,
        status: "completed",
      }),
    ).rejects.toThrow("Invalid status transition");
  });
});
// @generated-end test-updateStatus


// @generated-start test-reorder
describe("reorder", () => {
  test("does nothing when unauthenticated", async ({ testClient }) => {
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

    await testClient.mutation(api["test-gen"].mutations.reorder, {
      testGenId: recordId,
      newPosition: 999,
    });

    const record = await testClient.run(async (ctx: any) => ctx.db.get(recordId));
    expect(record.position).toBe(1);
  });

  test("updates position field", async ({ client, testClient }) => {
    await client.mutation(api["test-gen"].mutations.create, {
      title: "Reorder test",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("test-gen").collect(),
    );

    await client.mutation(api["test-gen"].mutations.reorder, {
      testGenId: records[0]._id,
      newPosition: 42,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(records[0]._id),
    );
    expect(updated.position).toBe(42);
  });
});
// @generated-end test-reorder
