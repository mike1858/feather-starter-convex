// Test Matrix: tasks queries
// | # | Query     | State                        | What to verify                                   |
// |---|-----------|------------------------------|--------------------------------------------------|
// | 1 | myTasks   | with assigned tasks          | returns only current user's tasks                |
// | 2 | myTasks   | position ordering            | sorted by position ascending                     |
// | 3 | myTasks   | unauthenticated              | returns empty array                              |
// | 4 | teamPool  | mixed visibility/assignment  | returns only unassigned shared tasks             |
// | 5 | teamPool  | position ordering            | sorted by position ascending                     |
// | 6 | teamPool  | unauthenticated              | returns empty array                              |
// | 7 | getById   | valid task                   | returns full task object                         |
// | 8 | getById   | unauthenticated              | returns null                                     |
// | 9 | listUsers | multiple users               | returns all users with expected fields           |
// |10 | listUsers | unauthenticated              | returns empty array                              |

import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

describe("myTasks", () => {
  test("returns only tasks assigned to current user", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, { title: "Task 1" });
    await client.mutation(api.tasks.mutations.create, { title: "Task 2" });

    // Other user's task (raw insert — can't call mutation as another user)
    const otherUserId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "Other" }),
    );
    await testClient.run(async (ctx: any) =>
      ctx.db.insert("tasks", {
        title: "Other's task",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: otherUserId,
        assigneeId: otherUserId,
        position: 3,
      }),
    );

    const tasks = await client.query(api.tasks.queries.myTasks, {});
    expect(tasks).toHaveLength(2);
    expect(tasks.map((t: any) => t.title)).toContain("Task 1");
    expect(tasks.map((t: any) => t.title)).toContain("Task 2");
  });

  test("sorts by position ascending", async ({
    client,
    userId,
    testClient,
  }) => {
    // Raw insert with specific positions (mutation uses Date.now())
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("tasks", {
        title: "Second",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 200,
      });
      await ctx.db.insert("tasks", {
        title: "First",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 100,
      });
    });

    const tasks = await client.query(api.tasks.queries.myTasks, {});
    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe("First");
    expect(tasks[1].title).toBe("Second");
  });

  test("returns empty array when unauthenticated", async ({ testClient }) => {
    const tasks = await testClient.query(api.tasks.queries.myTasks, {});
    expect(tasks).toEqual([]);
  });
});

describe("teamPool", () => {
  test("returns only unassigned shared tasks", async ({
    client,
    userId,
    testClient,
  }) => {
    // Shared + unassigned (raw insert — create always assigns to creator)
    await testClient.run(async (ctx: any) =>
      ctx.db.insert("tasks", {
        title: "Pool task",
        priority: false,
        status: "todo",
        visibility: "shared",
        creatorId: userId,
        position: 1,
      }),
    );

    // Private task (excluded)
    await client.mutation(api.tasks.mutations.create, {
      title: "Private task",
    });

    // Shared + assigned (excluded)
    const otherUserId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "Other" }),
    );
    await testClient.run(async (ctx: any) =>
      ctx.db.insert("tasks", {
        title: "Assigned shared task",
        priority: false,
        status: "todo",
        visibility: "shared",
        creatorId: userId,
        assigneeId: otherUserId,
        position: 2,
      }),
    );

    const pool = await client.query(api.tasks.queries.teamPool, {});
    expect(pool).toHaveLength(1);
    expect(pool[0].title).toBe("Pool task");
  });

  test("sorts by position ascending", async ({
    client,
    userId,
    testClient,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("tasks", {
        title: "Second",
        priority: false,
        status: "todo",
        visibility: "shared",
        creatorId: userId,
        position: 200,
      });
      await ctx.db.insert("tasks", {
        title: "First",
        priority: false,
        status: "todo",
        visibility: "shared",
        creatorId: userId,
        position: 100,
      });
    });

    const pool = await client.query(api.tasks.queries.teamPool, {});
    expect(pool).toHaveLength(2);
    expect(pool[0].title).toBe("First");
    expect(pool[1].title).toBe("Second");
  });

  test("returns empty array when unauthenticated", async ({ testClient }) => {
    const pool = await testClient.query(api.tasks.queries.teamPool, {});
    expect(pool).toEqual([]);
  });
});

describe("getById", () => {
  test("returns task by ID when authenticated", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "Get by ID task",
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );

    const task = await client.query(api.tasks.queries.getById, {
      taskId: tasks[0]._id,
    });
    expect(task).not.toBeNull();
    expect(task!.title).toBe("Get by ID task");
    expect(task!.creatorId).toBe(userId);
  });

  test("returns null when unauthenticated", async ({ testClient }) => {
    const taskId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("tasks", {
        title: "Auth test",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: await ctx.db.insert("users", { name: "Owner" }),
        position: 1,
      }),
    );

    const task = await testClient.query(api.tasks.queries.getById, {
      taskId,
    });
    expect(task).toBeNull();
  });
});

describe("listUsers", () => {
  test("returns all users with name, username, and email fields", async ({
    client,
    testClient,
  }) => {
    await testClient.run(async (ctx: any) =>
      ctx.db.insert("users", {
        name: "Second User",
        username: "second",
        email: "second@example.com",
      }),
    );

    const users = await client.query(api.tasks.queries.listUsers, {});
    expect(users.length).toBeGreaterThanOrEqual(2);

    for (const u of users) {
      expect(u).toHaveProperty("_id");
    }

    const secondUser = users.find((u: any) => u.username === "second");
    expect(secondUser!.name).toBe("Second User");
    expect(secondUser!.email).toBe("second@example.com");
  });

  test("returns empty array when unauthenticated", async ({ testClient }) => {
    const users = await testClient.query(api.tasks.queries.listUsers, {});
    expect(users).toEqual([]);
  });
});
