// @generated-start imports
import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";
// @generated-end imports

// @custom-start imports
// @custom-end imports

// @generated-start test-create
describe("create", () => {
  test("creates a Todo with default values", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api.todos.mutations.create, {
      title: "Test title",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("todos").collect(),
    );
    expect(records).toHaveLength(1);
    expect(records[0].title).toBe("Test title");
    expect(records[0].completed).toBe(false);
    expect(records[0].userId).toBe(userId);
    expect(records[0].position).toBeTypeOf("number");
  });

  test("creates a Todo with all fields specified", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.todos.mutations.create, {
      title: "Full title",
      completed: true,
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("todos").collect(),
    );
    expect(records).toHaveLength(1);
    expect(records[0].title).toBe("Full title");
    expect(records[0].completed).toBe(true);
  });

  test("does nothing when unauthenticated", async ({ testClient }) => {
    await testClient.mutation(api.todos.mutations.create, {
      title: "Should not be created",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("todos").collect(),
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
      return ctx.db.insert("todos", {
        title: "Seed",
        completed: false,
        userId: userId,
        position: 1,
      });
    });

    await testClient.mutation(api.todos.mutations.update, {
      todosId: recordId,
      title: "Should not change",
    });

    const record = await testClient.run(async (ctx: any) => ctx.db.get(recordId));
    expect(record.title).toBe("Seed");
  });

  test("updates only title when title provided", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.todos.mutations.create, {
      title: "Original title",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("todos").collect(),
    );
    const recordId = records[0]._id;

    await client.mutation(api.todos.mutations.update, {
      todosId: recordId,
      title: "Updated title",
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(recordId),
    );
    expect(updated.title).toBe("Updated title");
    expect(updated.completed).toBe(false);
  });

  test("updates only completed when completed provided", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.todos.mutations.create, {
      title: "Keep this title",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("todos").collect(),
    );
    const recordId = records[0]._id;

    await client.mutation(api.todos.mutations.update, {
      todosId: recordId,
      completed: true,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(recordId),
    );
    expect(updated.title).toBe("Keep this title");
    expect(updated.completed).toBe(true);
  });

  test("throws when Todo not found", async ({ client, testClient }) => {
    await client.mutation(api.todos.mutations.create, {
      title: "Temporary",
    });
    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("todos").collect(),
    );
    const recordId = records[0]._id;
    await testClient.run(async (ctx: any) => ctx.db.delete(recordId));

    await expect(
      client.mutation(api.todos.mutations.update, {
        todosId: recordId,
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
      return ctx.db.insert("todos", {
        title: "Seed",
        completed: false,
        userId: userId,
        position: 1,
      });
    });

    await testClient.mutation(api.todos.mutations.remove, { todosId: recordId });

    const record = await testClient.run(async (ctx: any) => ctx.db.get(recordId));
    expect(record).not.toBeNull();
  });

  test("deletes a Todo", async ({ client, testClient }) => {
    await client.mutation(api.todos.mutations.create, {
      title: "To delete",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("todos").collect(),
    );
    expect(records).toHaveLength(1);

    await client.mutation(api.todos.mutations.remove, {
      todosId: records[0]._id,
    });

    const remaining = await testClient.run(async (ctx: any) =>
      ctx.db.query("todos").collect(),
    );
    expect(remaining).toHaveLength(0);
  });
});
// @generated-end test-remove



// @generated-start test-reorder
describe("reorder", () => {
  test("does nothing when unauthenticated", async ({ testClient }) => {
    const recordId = await testClient.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", { name: "Seed" });
      return ctx.db.insert("todos", {
        title: "Seed",
        completed: false,
        userId: userId,
        position: 1,
      });
    });

    await testClient.mutation(api.todos.mutations.reorder, {
      todosId: recordId,
      newPosition: 999,
    });

    const record = await testClient.run(async (ctx: any) => ctx.db.get(recordId));
    expect(record.position).toBe(1);
  });

  test("updates position field", async ({ client, testClient }) => {
    await client.mutation(api.todos.mutations.create, {
      title: "Reorder test",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("todos").collect(),
    );

    await client.mutation(api.todos.mutations.reorder, {
      todosId: records[0]._id,
      newPosition: 42,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(records[0]._id),
    );
    expect(updated.position).toBe(42);
  });
});
// @generated-end test-reorder
