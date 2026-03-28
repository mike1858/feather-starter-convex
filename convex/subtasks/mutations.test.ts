// Test Matrix: subtasks mutations
// | # | Mutation    | State                          | What to verify                                    |
// |---|------------|--------------------------------|---------------------------------------------------|
// | 1 | create     | with defaults                  | title, status=todo, taskId, creatorId, "created"  |
// | 2 | create     | unauthenticated                | no subtask inserted                               |
// | 3 | update     | title change                   | title updated                                     |
// | 4 | update     | no title specified             | title unchanged                                   |
// | 5 | update     | unauthenticated                | no change                                         |
// | 6 | update     | subtask not found              | throws "Subtask not found"                        |
// | 7 | remove     | existing subtask               | subtask deleted                                   |
// | 8 | remove     | unauthenticated                | subtask not deleted                               |
// | 9 | toggleDone | todo -> done                   | status=done, "completed" log                      |
// |10 | toggleDone | done -> todo                   | status=todo                                       |
// |11 | toggleDone | promoted subtask               | throws "already been promoted"                    |
// |12 | toggleDone | unauthenticated                | status unchanged                                  |
// |13 | toggleDone | subtask not found              | throws "Subtask not found"                        |
// |14 | reorder    | valid position                 | position updated                                  |
// |15 | reorder    | unauthenticated                | position unchanged                                |
// |16 | promote    | valid subtask                  | new task created from subtask title               |
// |17 | promote    | inherits parent projectId      | new task has parent's projectId                   |
// |18 | promote    | subtask state after promote    | status=promoted, promotedToTaskId set             |
// |19 | promote    | already promoted               | throws "already been promoted"                    |
// |20 | promote    | unauthenticated                | no change                                         |
// |21 | promote    | subtask not found              | throws "Subtask not found"                        |

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

describe("create", () => {
  test("creates subtask with todo status and logs created activity", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);

    await client.mutation(api.subtasks.mutations.create, {
      title: "My subtask",
      taskId,
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("subtasks").collect(),
    );
    expect(records).toHaveLength(1);
    expect(records[0].title).toBe("My subtask");
    expect(records[0].status).toBe("todo");
    expect(records[0].taskId).toBe(taskId);
    expect(records[0].creatorId).toBe(userId);
    expect(records[0].position).toBeTypeOf("number");

    const logs = await testClient.run(async (ctx: any) =>
      ctx.db.query("activityLogs").collect(),
    );
    expect(logs).toHaveLength(1);
    expect(logs[0].entityType).toBe("subtask");
    expect(logs[0].entityId).toBe(records[0]._id);
    expect(logs[0].action).toBe("created");
  });

  test("silently ignores unauthenticated call", async ({ testClient }) => {
    const taskId = await seedTask(testClient);

    await testClient.mutation(api.subtasks.mutations.create, {
      title: "Should not be created",
      taskId,
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("subtasks").collect(),
    );
    expect(records).toHaveLength(0);
  });
});

describe("update", () => {
  test("updates title", async ({ client, userId, testClient }) => {
    const taskId = await seedTask(testClient, userId);
    await client.mutation(api.subtasks.mutations.create, {
      title: "Original",
      taskId,
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("subtasks").collect(),
    );

    await client.mutation(api.subtasks.mutations.update, {
      subtaskId: records[0]._id,
      title: "Updated",
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(records[0]._id),
    );
    expect(updated.title).toBe("Updated");
  });

  test("preserves title when not specified", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);
    await client.mutation(api.subtasks.mutations.create, {
      title: "Keep me",
      taskId,
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("subtasks").collect(),
    );

    await client.mutation(api.subtasks.mutations.update, {
      subtaskId: records[0]._id,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(records[0]._id),
    );
    expect(updated.title).toBe("Keep me");
  });

  test("silently ignores unauthenticated call", async ({ testClient }) => {
    const taskId = await seedTask(testClient);
    const subtaskId = await testClient.run(async (ctx: any) => {
      const uid = (await ctx.db.query("users").collect())[0]._id;
      return ctx.db.insert("subtasks", {
        title: "Seed",
        status: "todo",
        taskId,
        position: 1,
        creatorId: uid,
      });
    });

    await testClient.mutation(api.subtasks.mutations.update, {
      subtaskId,
      title: "Should not change",
    });

    const record = await testClient.run(async (ctx: any) =>
      ctx.db.get(subtaskId),
    );
    expect(record.title).toBe("Seed");
  });

  test("throws 'Subtask not found' for deleted subtask", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);
    await client.mutation(api.subtasks.mutations.create, {
      title: "Temp",
      taskId,
    });
    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("subtasks").collect(),
    );
    const subtaskId = records[0]._id;
    await testClient.run(async (ctx: any) => ctx.db.delete(subtaskId));

    await expect(
      client.mutation(api.subtasks.mutations.update, {
        subtaskId,
        title: "Nope",
      }),
    ).rejects.toThrow("Subtask not found");
  });
});

describe("remove", () => {
  test("deletes subtask", async ({ client, userId, testClient }) => {
    const taskId = await seedTask(testClient, userId);
    await client.mutation(api.subtasks.mutations.create, {
      title: "To delete",
      taskId,
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("subtasks").collect(),
    );
    expect(records).toHaveLength(1);

    await client.mutation(api.subtasks.mutations.remove, {
      subtaskId: records[0]._id,
    });

    expect(
      await testClient.run(async (ctx: any) =>
        ctx.db.query("subtasks").collect(),
      ),
    ).toHaveLength(0);
  });

  test("silently ignores unauthenticated call", async ({ testClient }) => {
    const taskId = await seedTask(testClient);
    const subtaskId = await testClient.run(async (ctx: any) => {
      const uid = (await ctx.db.query("users").collect())[0]._id;
      return ctx.db.insert("subtasks", {
        title: "Seed",
        status: "todo",
        taskId,
        position: 1,
        creatorId: uid,
      });
    });

    await testClient.mutation(api.subtasks.mutations.remove, { subtaskId });

    const record = await testClient.run(async (ctx: any) =>
      ctx.db.get(subtaskId),
    );
    expect(record).not.toBeNull();
  });
});

describe("toggleDone", () => {
  test("toggles todo to done with completed activity log", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);
    await client.mutation(api.subtasks.mutations.create, {
      title: "Toggle me",
      taskId,
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("subtasks").collect(),
    );
    expect(records[0].status).toBe("todo");

    await client.mutation(api.subtasks.mutations.toggleDone, {
      subtaskId: records[0]._id,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(records[0]._id),
    );
    expect(updated.status).toBe("done");

    const logs = await testClient.run(async (ctx: any) =>
      ctx.db.query("activityLogs").collect(),
    );
    const completedLog = logs.find((l: any) => l.action === "completed");
    expect(completedLog.entityType).toBe("subtask");
    expect(completedLog.entityId).toBe(records[0]._id);
  });

  test("toggles done back to todo", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);
    await client.mutation(api.subtasks.mutations.create, {
      title: "Toggle me",
      taskId,
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("subtasks").collect(),
    );

    await client.mutation(api.subtasks.mutations.toggleDone, {
      subtaskId: records[0]._id,
    });
    await client.mutation(api.subtasks.mutations.toggleDone, {
      subtaskId: records[0]._id,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(records[0]._id),
    );
    expect(updated.status).toBe("todo");
  });

  test("rejects toggling a promoted subtask", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);
    await client.mutation(api.subtasks.mutations.create, {
      title: "Promote then toggle",
      taskId,
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("subtasks").collect(),
    );

    await client.mutation(api.subtasks.mutations.promote, {
      subtaskId: records[0]._id,
    });

    await expect(
      client.mutation(api.subtasks.mutations.toggleDone, {
        subtaskId: records[0]._id,
      }),
    ).rejects.toThrow("Subtask has already been promoted");
  });

  test("silently ignores unauthenticated call", async ({ testClient }) => {
    const taskId = await seedTask(testClient);
    const subtaskId = await testClient.run(async (ctx: any) => {
      const uid = (await ctx.db.query("users").collect())[0]._id;
      return ctx.db.insert("subtasks", {
        title: "Seed",
        status: "todo",
        taskId,
        position: 1,
        creatorId: uid,
      });
    });

    await testClient.mutation(api.subtasks.mutations.toggleDone, {
      subtaskId,
    });

    const record = await testClient.run(async (ctx: any) =>
      ctx.db.get(subtaskId),
    );
    expect(record.status).toBe("todo");
  });

  test("throws 'Subtask not found' for deleted subtask", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);
    await client.mutation(api.subtasks.mutations.create, {
      title: "Temp",
      taskId,
    });
    const subtasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("subtasks").collect(),
    );
    const subtaskId = subtasks[0]._id;
    await testClient.run(async (ctx: any) => ctx.db.delete(subtaskId));

    await expect(
      client.mutation(api.subtasks.mutations.toggleDone, { subtaskId }),
    ).rejects.toThrow("Subtask not found");
  });
});

describe("reorder", () => {
  test("updates position field", async ({ client, userId, testClient }) => {
    const taskId = await seedTask(testClient, userId);
    await client.mutation(api.subtasks.mutations.create, {
      title: "Reorder test",
      taskId,
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("subtasks").collect(),
    );

    await client.mutation(api.subtasks.mutations.reorder, {
      subtaskId: records[0]._id,
      newPosition: 42,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(records[0]._id),
    );
    expect(updated.position).toBe(42);
  });

  test("silently ignores unauthenticated call", async ({ testClient }) => {
    const taskId = await seedTask(testClient);
    const subtaskId = await testClient.run(async (ctx: any) => {
      const uid = (await ctx.db.query("users").collect())[0]._id;
      return ctx.db.insert("subtasks", {
        title: "Seed",
        status: "todo",
        taskId,
        position: 1,
        creatorId: uid,
      });
    });

    await testClient.mutation(api.subtasks.mutations.reorder, {
      subtaskId,
      newPosition: 999,
    });

    const record = await testClient.run(async (ctx: any) =>
      ctx.db.get(subtaskId),
    );
    expect(record.position).toBe(1);
  });
});

describe("promote", () => {
  test("creates new task from subtask title", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);
    await client.mutation(api.subtasks.mutations.create, {
      title: "Promote me",
      taskId,
    });

    const subtasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("subtasks").collect(),
    );

    await client.mutation(api.subtasks.mutations.promote, {
      subtaskId: subtasks[0]._id,
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    expect(tasks).toHaveLength(2);
    const newTask = tasks.find((t: any) => t.title === "Promote me");
    expect(newTask.status).toBe("todo");
    expect(newTask.visibility).toBe("shared");
    expect(newTask.priority).toBe(false);
  });

  test("inherits parent task projectId", async ({ client, testClient }) => {
    await client.mutation(api.projects.mutations.create, {
      name: "Test Project",
    });
    const projects = await testClient.run(async (ctx: any) =>
      ctx.db.query("projects").collect(),
    );
    const projectId = projects[0]._id;

    await client.mutation(api.tasks.mutations.createInProject, {
      title: "Project Task",
      projectId,
    });
    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    const taskId = tasks[0]._id;

    await client.mutation(api.subtasks.mutations.create, {
      title: "Promote to project",
      taskId,
    });
    const subtasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("subtasks").collect(),
    );
    await client.mutation(api.subtasks.mutations.promote, {
      subtaskId: subtasks[0]._id,
    });

    const allTasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    const newTask = allTasks.find(
      (t: any) => t.title === "Promote to project",
    );
    expect(newTask.projectId).toBe(projectId);
  });

  test("marks subtask as promoted with promotedToTaskId and logs activity", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);
    await client.mutation(api.subtasks.mutations.create, {
      title: "Check promoted state",
      taskId,
    });

    const subtasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("subtasks").collect(),
    );

    await client.mutation(api.subtasks.mutations.promote, {
      subtaskId: subtasks[0]._id,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(subtasks[0]._id),
    );
    expect(updated.status).toBe("promoted");
    expect(updated.promotedToTaskId).toBeTypeOf("string");

    const logs = await testClient.run(async (ctx: any) =>
      ctx.db.query("activityLogs").collect(),
    );
    const promotedLog = logs.find((l: any) => l.action === "promoted");
    expect(promotedLog.entityType).toBe("subtask");
    expect(promotedLog.entityId).toBe(subtasks[0]._id);
    const metadata = JSON.parse(promotedLog.metadata);
    expect(metadata.newTaskId).toBeTypeOf("string");
  });

  test("rejects promoting already-promoted subtask", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);
    await client.mutation(api.subtasks.mutations.create, {
      title: "Double promote",
      taskId,
    });

    const subtasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("subtasks").collect(),
    );

    await client.mutation(api.subtasks.mutations.promote, {
      subtaskId: subtasks[0]._id,
    });

    await expect(
      client.mutation(api.subtasks.mutations.promote, {
        subtaskId: subtasks[0]._id,
      }),
    ).rejects.toThrow("Subtask has already been promoted");
  });

  test("silently ignores unauthenticated call", async ({ testClient }) => {
    const taskId = await seedTask(testClient);
    const subtaskId = await testClient.run(async (ctx: any) => {
      const uid = (await ctx.db.query("users").collect())[0]._id;
      return ctx.db.insert("subtasks", {
        title: "Seed",
        status: "todo",
        taskId,
        position: 1,
        creatorId: uid,
      });
    });

    await testClient.mutation(api.subtasks.mutations.promote, { subtaskId });

    const record = await testClient.run(async (ctx: any) =>
      ctx.db.get(subtaskId),
    );
    expect(record.status).toBe("todo");
  });

  test("throws 'Subtask not found' for deleted subtask", async ({
    client,
    userId,
    testClient,
  }) => {
    const taskId = await seedTask(testClient, userId);
    await client.mutation(api.subtasks.mutations.create, {
      title: "Temp",
      taskId,
    });
    const subtasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("subtasks").collect(),
    );
    const subtaskId = subtasks[0]._id;
    await testClient.run(async (ctx: any) => ctx.db.delete(subtaskId));

    await expect(
      client.mutation(api.subtasks.mutations.promote, { subtaskId }),
    ).rejects.toThrow("Subtask not found");
  });
});
