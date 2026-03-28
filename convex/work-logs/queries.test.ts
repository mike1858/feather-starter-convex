// Test Matrix: work-logs queries
// | # | Query      | State                     | What to verify                              |
// |---|------------|---------------------------|---------------------------------------------|
// | 1 | listByTask | no work logs              | empty entries, totalMinutes=0               |
// | 2 | listByTask | with entries              | returns all entries for task                |
// | 3 | listByTask | totalMinutes calculation  | sums all timeMinutes values                 |
// | 4 | listByTask | entries without time      | ignores undefined timeMinutes in total      |
// | 5 | listByTask | unauthenticated           | empty entries, totalMinutes=0               |

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
  test("returns empty entries and zero totalMinutes for task with no logs", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);

    const result = await client.query(
      api["work-logs"].queries.listByTask,
      { taskId },
    );

    expect(result.entries).toHaveLength(0);
    expect(result.totalMinutes).toBe(0);
  });

  test("returns all entries for a task", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);

    await client.mutation(api["work-logs"].mutations.create, {
      body: "First entry",
      timeMinutes: 30,
      taskId,
    });
    await client.mutation(api["work-logs"].mutations.create, {
      body: "Second entry",
      timeMinutes: 60,
      taskId,
    });

    const result = await client.query(
      api["work-logs"].queries.listByTask,
      { taskId },
    );

    expect(result.entries).toHaveLength(2);
  });

  test("sums timeMinutes across all entries", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);

    await client.mutation(api["work-logs"].mutations.create, {
      body: "Entry 1",
      timeMinutes: 30,
      taskId,
    });
    await client.mutation(api["work-logs"].mutations.create, {
      body: "Entry 2",
      timeMinutes: 60,
      taskId,
    });

    const result = await client.query(
      api["work-logs"].queries.listByTask,
      { taskId },
    );

    expect(result.totalMinutes).toBe(90);
  });

  test("ignores entries without timeMinutes in total", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);

    await client.mutation(api["work-logs"].mutations.create, {
      body: "With time",
      timeMinutes: 45,
      taskId,
    });
    await client.mutation(api["work-logs"].mutations.create, {
      body: "Without time",
      taskId,
    });

    const result = await client.query(
      api["work-logs"].queries.listByTask,
      { taskId },
    );

    expect(result.entries).toHaveLength(2);
    expect(result.totalMinutes).toBe(45);
  });

  test("returns empty entries when unauthenticated", async ({
    testClient,
  }) => {
    const taskId = await seedTask(testClient);

    const result = await testClient.query(
      api["work-logs"].queries.listByTask,
      { taskId },
    );

    expect(result.entries).toHaveLength(0);
    expect(result.totalMinutes).toBe(0);
  });
});
