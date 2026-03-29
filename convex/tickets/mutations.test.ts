// Test Matrix: tickets mutations
// | # | Mutation | State               | What to verify                       |
// |---|---------|----------------------|--------------------------------------|
// | 1 | create  | with defaults        | title, userId, assigneeId, position  |
// | 2 | create  | with all fields      | description, status, priority        |
// | 3 | create  | unauthenticated      | no ticket inserted                   |
// | 4 | update  | unauthenticated      | no change to ticket                  |
// | 5 | update  | title only           | title changed, description untouched |
// | 6 | update  | description only     | description changed, title untouched |
// | 7 | update  | not found            | throws "not found"                   |
// | 8 | remove  | unauthenticated      | ticket not deleted                   |
// | 9 | remove  | existing ticket      | ticket deleted                       |
// |10 | assign  | unauthenticated      | no change                            |
// |11 | assign  | not found            | throws "not found"                   |
// |12 | assign  | to another user      | assigneeId updated                   |
// |13 | assign  | unassign             | assigneeId cleared                   |
// |14 | reorder | unauthenticated      | position unchanged                   |
// |15 | reorder | valid position       | position updated                     |

// @generated-start imports
import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";
// @generated-end imports

// @custom-start imports
// @custom-end imports

// @generated-start test-create
describe("create", () => {
  test("creates a Ticket with default values", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api.tickets.mutations.create, {
      title: "Test title",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("tickets").collect(),
    );
    expect(records).toHaveLength(1);
    expect(records[0].title).toBe("Test title");
    expect(records[0].userId).toBe(userId);
    expect(records[0].assigneeId).toBe(userId);
    expect(records[0].position).toBeTypeOf("number");
  });

  test("creates a Ticket with all fields specified", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tickets.mutations.create, {
      title: "Full title",
      description: "A detailed description",
      status: "open",
      priority: "low",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("tickets").collect(),
    );
    expect(records).toHaveLength(1);
    expect(records[0].title).toBe("Full title");
    expect(records[0].description).toBe("A detailed description");
  });

  test("does nothing when unauthenticated", async ({ testClient }) => {
    await testClient.mutation(api.tickets.mutations.create, {
      title: "Should not be created",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("tickets").collect(),
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
      return ctx.db.insert("tickets", {
        title: "Seed",
        description: "Seed content",
        status: "open",
        priority: "low",
        userId: userId,
        assigneeId: userId,
        position: 1,
      });
    });

    await testClient.mutation(api.tickets.mutations.update, {
      ticketsId: recordId,
      title: "Should not change",
    });

    const record = await testClient.run(async (ctx: any) => ctx.db.get(recordId));
    expect(record.title).toBe("Seed");
  });

  test("updates only title when title provided", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tickets.mutations.create, {
      title: "Original title",
      description: "Original desc",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("tickets").collect(),
    );
    const recordId = records[0]._id;

    await client.mutation(api.tickets.mutations.update, {
      ticketsId: recordId,
      title: "Updated title",
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(recordId),
    );
    expect(updated.title).toBe("Updated title");
    expect(updated.description).toBe("Original desc");
  });

  test("updates only description when description provided", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tickets.mutations.create, {
      title: "Keep this title",
      description: "Old desc",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("tickets").collect(),
    );
    const recordId = records[0]._id;

    await client.mutation(api.tickets.mutations.update, {
      ticketsId: recordId,
      description: "New desc",
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(recordId),
    );
    expect(updated.title).toBe("Keep this title");
    expect(updated.description).toBe("New desc");
  });

  test("throws when Ticket not found", async ({ client, testClient }) => {
    await client.mutation(api.tickets.mutations.create, {
      title: "Temporary",
    });
    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("tickets").collect(),
    );
    const recordId = records[0]._id;
    await testClient.run(async (ctx: any) => ctx.db.delete(recordId));

    await expect(
      client.mutation(api.tickets.mutations.update, {
        ticketsId: recordId,
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
      return ctx.db.insert("tickets", {
        title: "Seed",
        description: "Seed content",
        status: "open",
        priority: "low",
        userId: userId,
        assigneeId: userId,
        position: 1,
      });
    });

    await testClient.mutation(api.tickets.mutations.remove, { ticketsId: recordId });

    const record = await testClient.run(async (ctx: any) => ctx.db.get(recordId));
    expect(record).not.toBeNull();
  });

  test("deletes a Ticket", async ({ client, testClient }) => {
    await client.mutation(api.tickets.mutations.create, {
      title: "To delete",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("tickets").collect(),
    );
    expect(records).toHaveLength(1);

    await client.mutation(api.tickets.mutations.remove, {
      ticketsId: records[0]._id,
    });

    const remaining = await testClient.run(async (ctx: any) =>
      ctx.db.query("tickets").collect(),
    );
    expect(remaining).toHaveLength(0);
  });
});
// @generated-end test-remove


// @generated-start test-assign
describe("assign", () => {
  test("does nothing when unauthenticated", async ({ testClient }) => {
    const recordId = await testClient.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", { name: "Seed" });
      return ctx.db.insert("tickets", {
        title: "Seed",
        description: "Seed content",
        status: "open",
        priority: "low",
        userId: userId,
        assigneeId: userId,
        position: 1,
      });
    });

    const otherUserId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "Other" }),
    );

    await testClient.mutation(api.tickets.mutations.assign, {
      ticketsId: recordId,
      assigneeId: otherUserId,
    });

    // Unauthenticated call should not change assignee
    const record = await testClient.run(async (ctx: any) => ctx.db.get(recordId));
    expect(record.assigneeId).not.toBe(otherUserId);
  });

  test("throws when Ticket not found", async ({ client, testClient }) => {
    await client.mutation(api.tickets.mutations.create, {
      title: "Temp",
    });
    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("tickets").collect(),
    );
    const recordId = records[0]._id;
    await testClient.run(async (ctx: any) => ctx.db.delete(recordId));

    await expect(
      client.mutation(api.tickets.mutations.assign, {
        ticketsId: recordId,
        assigneeId: undefined,
      }),
    ).rejects.toThrow("not found");
  });

  test("assigns ticket to another user", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tickets.mutations.create, {
      title: "Assign test",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("tickets").collect(),
    );

    const otherUserId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "Other User" }),
    );

    await client.mutation(api.tickets.mutations.assign, {
      ticketsId: records[0]._id,
      assigneeId: otherUserId,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(records[0]._id),
    );
    expect(updated.assigneeId).toBe(otherUserId);
  });

  test("unassigns ticket", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tickets.mutations.create, {
      title: "Unassign test",
    });
    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("tickets").collect(),
    );

    await client.mutation(api.tickets.mutations.assign, {
      ticketsId: records[0]._id,
      assigneeId: undefined,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(records[0]._id),
    );
    expect(updated.assigneeId).toBeUndefined();
  });
});
// @generated-end test-assign

// @generated-start test-reorder
describe("reorder", () => {
  test("does nothing when unauthenticated", async ({ testClient }) => {
    const recordId = await testClient.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", { name: "Seed" });
      return ctx.db.insert("tickets", {
        title: "Seed",
        description: "Seed content",
        status: "open",
        priority: "low",
        userId: userId,
        assigneeId: userId,
        position: 1,
      });
    });

    await testClient.mutation(api.tickets.mutations.reorder, {
      ticketsId: recordId,
      newPosition: 999,
    });

    const record = await testClient.run(async (ctx: any) => ctx.db.get(recordId));
    expect(record.position).toBe(1);
  });

  test("updates position field", async ({ client, testClient }) => {
    await client.mutation(api.tickets.mutations.create, {
      title: "Reorder test",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("tickets").collect(),
    );

    await client.mutation(api.tickets.mutations.reorder, {
      ticketsId: records[0]._id,
      newPosition: 42,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(records[0]._id),
    );
    expect(updated.position).toBe(42);
  });
});
// @generated-end test-reorder
