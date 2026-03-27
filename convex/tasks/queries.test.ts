import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

describe("myTasks", () => {
  test("returns tasks assigned to current user", async ({
    client,
    testClient,
  }) => {
    // Create 2 tasks assigned to the authenticated user
    await client.mutation(api.tasks.mutations.create, { title: "Task 1" });
    await client.mutation(api.tasks.mutations.create, { title: "Task 2" });

    // Create another user and a task assigned to them
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

  test("returns tasks sorted by position ascending", async ({
    client,
    userId,
    testClient,
  }) => {
    // Insert tasks with specific positions out of order
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
    // Shared + unassigned (should appear)
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

    // Private task (should NOT appear)
    await client.mutation(api.tasks.mutations.create, {
      title: "Private task",
    });

    // Shared + assigned (should NOT appear)
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

  test("returns sorted by position ascending", async ({
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
    const taskId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("tasks", {
        title: "Get by ID task",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 1,
      }),
    );

    const task = await client.query(api.tasks.queries.getById, { taskId });
    expect(task).not.toBeNull();
    expect(task!.title).toBe("Get by ID task");
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
  test("returns all users with expected fields", async ({
    client,
    testClient,
  }) => {
    // The test fixture already creates one user; add another with all fields
    await testClient.run(async (ctx: any) =>
      ctx.db.insert("users", {
        name: "Second User",
        username: "second",
        email: "second@example.com",
      }),
    );

    const users = await client.query(api.tasks.queries.listUsers, {});
    expect(users.length).toBeGreaterThanOrEqual(2);

    // Every user has _id
    for (const u of users) {
      expect(u).toHaveProperty("_id");
    }

    // The explicitly created user has all fields
    const secondUser = users.find((u: any) => u.username === "second");
    expect(secondUser).toBeDefined();
    expect(secondUser!.name).toBe("Second User");
    expect(secondUser!.email).toBe("second@example.com");
  });

  test("returns empty array when unauthenticated", async ({ testClient }) => {
    const users = await testClient.query(api.tasks.queries.listUsers, {});
    expect(users).toEqual([]);
  });
});
