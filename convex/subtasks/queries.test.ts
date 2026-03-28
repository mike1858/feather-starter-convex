// Test Matrix: subtasks queries
// | # | Query      | State                       | What to verify                              |
// |---|------------|-----------------------------|---------------------------------------------|
// | 1 | listByTask | no subtasks                 | empty list, completionCount { done:0, total:0 } |
// | 2 | listByTask | multiple subtasks           | sorted by position ascending                |
// | 3 | listByTask | mixed statuses              | completionCount counts done+promoted as done |
// | 4 | listByTask | unauthenticated             | empty list, zero counts                     |

import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

/** Helper: seed a task and return its ID */
async function seedTask(testClient: any, userId?: string) {
  return testClient.run(async (ctx: any) => {
    const uid =
      userId ?? (await ctx.db.insert("users", { name: "Seed" }));
    return ctx.db.insert("tasks", {
      title: "Parent Task",
      priority: false,
      status: "todo",
      visibility: "private",
      creatorId: uid,
      assigneeId: uid,
      position: 1,
    });
  });
}

describe("listByTask", () => {
  test("returns empty list for task with no subtasks", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);

    const result = await client.query(api.subtasks.queries.listByTask, {
      taskId,
    });

    expect(result.subtasks).toHaveLength(0);
    expect(result.completionCount).toEqual({ done: 0, total: 0 });
  });

  test("returns subtasks sorted by position ascending", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);

    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("subtasks", {
        title: "Second",
        status: "todo",
        taskId,
        position: 200,
        creatorId: userId,
      });
      await ctx.db.insert("subtasks", {
        title: "First",
        status: "todo",
        taskId,
        position: 100,
        creatorId: userId,
      });
      await ctx.db.insert("subtasks", {
        title: "Third",
        status: "todo",
        taskId,
        position: 300,
        creatorId: userId,
      });
    });

    const result = await client.query(api.subtasks.queries.listByTask, {
      taskId,
    });

    expect(result.subtasks).toHaveLength(3);
    expect(result.subtasks[0].title).toBe("First");
    expect(result.subtasks[1].title).toBe("Second");
    expect(result.subtasks[2].title).toBe("Third");
  });

  test("counts done and promoted as completed in completionCount", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);

    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("subtasks", {
        title: "Todo",
        status: "todo",
        taskId,
        position: 1,
        creatorId: userId,
      });
      await ctx.db.insert("subtasks", {
        title: "Done",
        status: "done",
        taskId,
        position: 2,
        creatorId: userId,
      });
      await ctx.db.insert("subtasks", {
        title: "Promoted",
        status: "promoted",
        taskId,
        position: 3,
        creatorId: userId,
      });
    });

    const result = await client.query(api.subtasks.queries.listByTask, {
      taskId,
    });

    expect(result.subtasks).toHaveLength(3);
    expect(result.completionCount).toEqual({ done: 2, total: 3 });
  });

  test("returns empty list when unauthenticated", async ({ testClient }) => {
    const taskId = await seedTask(testClient);

    const result = await testClient.query(api.subtasks.queries.listByTask, {
      taskId,
    });

    expect(result.subtasks).toHaveLength(0);
    expect(result.completionCount).toEqual({ done: 0, total: 0 });
  });
});
