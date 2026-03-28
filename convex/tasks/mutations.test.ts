// Test Matrix: tasks mutations
// | # | Mutation         | State                              | What to verify                                            |
// |---|------------------|------------------------------------|-----------------------------------------------------------|
// | 1 | create           | with defaults                      | title, status=todo, visibility=private, priority=false     |
// | 2 | create           | with all fields                    | description and priority persisted                         |
// | 3 | create           | unauthenticated                    | no task inserted                                          |
// | 4 | create           | activity log                       | "created" log with entityType=task                        |
// | 5 | update           | title only                         | title changed, other fields untouched, "edited" log       |
// | 6 | update           | description + priority             | both changed, title untouched                             |
// | 7 | update           | no fields changed                  | no activity log created                                   |
// | 8 | update           | task not found                     | throws "Task not found"                                   |
// | 9 | update           | unauthenticated                    | no change to task                                         |
// |10 | remove           | existing task                      | task deleted, "deleted" activity log                      |
// |11 | remove           | cascades subtasks                  | associated subtasks deleted                               |
// |12 | remove           | cascades work logs                 | associated work logs deleted                              |
// |13 | remove           | unauthenticated                    | task not deleted                                          |
// |14 | updateStatus     | todo -> in_progress                | status changed, "status_changed" log with from/to         |
// |15 | updateStatus     | in_progress -> done                | status changed to done                                    |
// |16 | updateStatus     | skip states (todo -> done)         | throws "Invalid status transition"                        |
// |17 | updateStatus     | backwards (done -> todo)           | throws "Invalid status transition"                        |
// |18 | updateStatus     | task not found                     | throws "Task not found"                                   |
// |19 | updateStatus     | unauthenticated                    | status unchanged                                          |
// |20 | assign           | to another user                    | assigneeId set, visibility=shared, "assigned" log         |
// |21 | assign           | to creator (self)                  | assigneeId set, visibility stays private                  |
// |22 | assign           | unassign private task              | assigneeId cleared, visibility=shared, "unassigned" log   |
// |23 | assign           | unassign already-shared task       | visibility stays shared                                   |
// |24 | assign           | task not found                     | throws "Task not found"                                   |
// |25 | assign           | unauthenticated                    | no change                                                 |
// |26 | createInProject  | with project                       | shared visibility, projectId set, defaults correct        |
// |27 | createInProject  | unauthenticated                    | no task inserted                                          |
// |28 | assignToProject  | assign to project                  | projectId set, visibility=shared                          |
// |29 | assignToProject  | remove from project (creator=assignee) | projectId cleared, visibility=private                 |
// |30 | assignToProject  | remove from project (diff assignee)| projectId cleared, visibility stays shared                |
// |31 | assignToProject  | task not found                     | throws "Task not found"                                   |
// |32 | assignToProject  | unauthenticated                    | no change                                                 |
// |33 | reorder          | valid position                     | position field updated                                    |
// |34 | reorder          | unauthenticated                    | position unchanged                                        |

import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

describe("create", () => {
  test("creates task with default status, visibility, and priority", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "My task",
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("My task");
    expect(tasks[0].status).toBe("todo");
    expect(tasks[0].visibility).toBe("private");
    expect(tasks[0].priority).toBe(false);
    expect(tasks[0].creatorId).toBe(userId);
    expect(tasks[0].assigneeId).toBe(userId);
    expect(tasks[0].position).toBeTypeOf("number");

    // Activity log side effect
    const logs = await testClient.run(async (ctx: any) =>
      ctx.db.query("activityLogs").collect(),
    );
    expect(logs).toHaveLength(1);
    expect(logs[0].entityType).toBe("task");
    expect(logs[0].entityId).toBe(tasks[0]._id);
    expect(logs[0].action).toBe("created");
    expect(logs[0].actor).toBe(userId);
  });

  test("creates task with description and priority when specified", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "Full task",
      description: "A detailed description",
      priority: true,
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Full task");
    expect(tasks[0].description).toBe("A detailed description");
    expect(tasks[0].priority).toBe(true);
  });

  test("silently ignores unauthenticated call", async ({ testClient }) => {
    await testClient.mutation(api.tasks.mutations.create, {
      title: "Should not be created",
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    expect(tasks).toHaveLength(0);
  });
});

describe("update", () => {
  test("updates title and logs edited activity", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "Original title",
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    const taskId = tasks[0]._id;

    await client.mutation(api.tasks.mutations.update, {
      taskId,
      title: "Updated title",
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(taskId),
    );
    expect(updated.title).toBe("Updated title");
    expect(updated.priority).toBe(false); // unchanged

    const logs = await testClient.run(async (ctx: any) =>
      ctx.db.query("activityLogs").collect(),
    );
    const editLog = logs.find((l: any) => l.action === "edited");
    expect(editLog.entityType).toBe("task");
    expect(editLog.entityId).toBe(taskId);
    const metadata = JSON.parse(editLog.metadata);
    expect(metadata.fields).toContain("title");
  });

  test("updates description and priority without changing title", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "Original",
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );

    await client.mutation(api.tasks.mutations.update, {
      taskId: tasks[0]._id,
      description: "New description",
      priority: true,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(tasks[0]._id),
    );
    expect(updated.description).toBe("New description");
    expect(updated.priority).toBe(true);
    expect(updated.title).toBe("Original");
  });

  test("skips activity log when no fields change", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "No-op update",
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );

    // Clear existing activity logs (from create)
    await testClient.run(async (ctx: any) => {
      const logs = await ctx.db.query("activityLogs").collect();
      for (const log of logs) await ctx.db.delete(log._id);
    });

    await client.mutation(api.tasks.mutations.update, {
      taskId: tasks[0]._id,
    });

    const logs = await testClient.run(async (ctx: any) =>
      ctx.db.query("activityLogs").collect(),
    );
    expect(logs).toHaveLength(0);
  });

  test("throws 'Task not found' for deleted task", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "Temporary",
    });
    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    const taskId = tasks[0]._id;
    await testClient.run(async (ctx: any) => ctx.db.delete(taskId));

    await expect(
      client.mutation(api.tasks.mutations.update, {
        taskId,
        title: "Nope",
      }),
    ).rejects.toThrow("Task not found");
  });

  test("silently ignores unauthenticated call", async ({ testClient }) => {
    const taskId = await testClient.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", { name: "Seed" });
      return ctx.db.insert("tasks", {
        title: "Seed",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 1,
      });
    });

    await testClient.mutation(api.tasks.mutations.update, {
      taskId,
      title: "Should not change",
    });

    const task = await testClient.run(async (ctx: any) => ctx.db.get(taskId));
    expect(task.title).toBe("Seed");
  });
});

describe("remove", () => {
  test("deletes task and logs deleted activity", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "To delete",
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    expect(tasks).toHaveLength(1);

    await client.mutation(api.tasks.mutations.remove, {
      taskId: tasks[0]._id,
    });

    const remaining = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    expect(remaining).toHaveLength(0);

    const logs = await testClient.run(async (ctx: any) =>
      ctx.db.query("activityLogs").collect(),
    );
    const deleteLog = logs.find((l: any) => l.action === "deleted");
    expect(deleteLog.entityType).toBe("task");
  });

  test("cascades deletion to subtasks", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "Task with subtasks",
    });
    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    const taskId = tasks[0]._id;

    await testClient.run(async (ctx: any) =>
      ctx.db.insert("subtasks", {
        title: "Child subtask",
        status: "todo",
        taskId,
        position: 1,
        creatorId: userId,
      }),
    );

    expect(
      await testClient.run(async (ctx: any) =>
        ctx.db.query("subtasks").collect(),
      ),
    ).toHaveLength(1);

    await client.mutation(api.tasks.mutations.remove, { taskId });

    expect(
      await testClient.run(async (ctx: any) =>
        ctx.db.query("subtasks").collect(),
      ),
    ).toHaveLength(0);
  });

  test("cascades deletion to work logs", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "Task with work logs",
    });
    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    const taskId = tasks[0]._id;

    await testClient.run(async (ctx: any) =>
      ctx.db.insert("workLogs", {
        body: "Logged work",
        timeMinutes: 30,
        taskId,
        creatorId: userId,
      }),
    );

    expect(
      await testClient.run(async (ctx: any) =>
        ctx.db.query("workLogs").collect(),
      ),
    ).toHaveLength(1);

    await client.mutation(api.tasks.mutations.remove, { taskId });

    expect(
      await testClient.run(async (ctx: any) =>
        ctx.db.query("workLogs").collect(),
      ),
    ).toHaveLength(0);
  });

  test("silently ignores unauthenticated call", async ({ testClient }) => {
    const taskId = await testClient.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", { name: "Seed" });
      return ctx.db.insert("tasks", {
        title: "Seed",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 1,
      });
    });

    await testClient.mutation(api.tasks.mutations.remove, { taskId });

    const task = await testClient.run(async (ctx: any) => ctx.db.get(taskId));
    expect(task).not.toBeNull();
  });
});

describe("updateStatus", () => {
  test("advances todo to in_progress with status_changed log", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "Status task",
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );

    await client.mutation(api.tasks.mutations.updateStatus, {
      taskId: tasks[0]._id,
      status: "in_progress",
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(tasks[0]._id),
    );
    expect(updated.status).toBe("in_progress");

    const logs = await testClient.run(async (ctx: any) =>
      ctx.db.query("activityLogs").collect(),
    );
    const statusLog = logs.find((l: any) => l.action === "status_changed");
    expect(statusLog.entityType).toBe("task");
    const metadata = JSON.parse(statusLog.metadata);
    expect(metadata.from).toBe("todo");
    expect(metadata.to).toBe("in_progress");
  });

  test("advances in_progress to done", async ({ client, testClient }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "Status task",
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );

    await client.mutation(api.tasks.mutations.updateStatus, {
      taskId: tasks[0]._id,
      status: "in_progress",
    });
    await client.mutation(api.tasks.mutations.updateStatus, {
      taskId: tasks[0]._id,
      status: "done",
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(tasks[0]._id),
    );
    expect(updated.status).toBe("done");
  });

  test("rejects skipping states (todo -> done)", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "Status task",
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );

    await expect(
      client.mutation(api.tasks.mutations.updateStatus, {
        taskId: tasks[0]._id,
        status: "done",
      }),
    ).rejects.toThrow("Invalid status transition");
  });

  test("rejects backwards transition (done -> todo)", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "Status task",
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );

    await client.mutation(api.tasks.mutations.updateStatus, {
      taskId: tasks[0]._id,
      status: "in_progress",
    });
    await client.mutation(api.tasks.mutations.updateStatus, {
      taskId: tasks[0]._id,
      status: "done",
    });

    await expect(
      client.mutation(api.tasks.mutations.updateStatus, {
        taskId: tasks[0]._id,
        status: "todo",
      }),
    ).rejects.toThrow("Invalid status transition");
  });

  test("throws 'Task not found' for deleted task", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, { title: "Temp" });
    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    const taskId = tasks[0]._id;
    await testClient.run(async (ctx: any) => ctx.db.delete(taskId));

    await expect(
      client.mutation(api.tasks.mutations.updateStatus, {
        taskId,
        status: "in_progress",
      }),
    ).rejects.toThrow("Task not found");
  });

  test("silently ignores unauthenticated call", async ({ testClient }) => {
    const taskId = await testClient.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", { name: "Seed" });
      return ctx.db.insert("tasks", {
        title: "Seed",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 1,
      });
    });

    await testClient.mutation(api.tasks.mutations.updateStatus, {
      taskId,
      status: "in_progress",
    });

    const task = await testClient.run(async (ctx: any) => ctx.db.get(taskId));
    expect(task.status).toBe("todo");
  });
});

describe("assign", () => {
  test("assigns to another user and flips visibility to shared", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "Assign task",
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    expect(tasks[0].visibility).toBe("private");

    const otherUserId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "Other User" }),
    );

    await client.mutation(api.tasks.mutations.assign, {
      taskId: tasks[0]._id,
      assigneeId: otherUserId,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(tasks[0]._id),
    );
    expect(updated.assigneeId).toBe(otherUserId);
    expect(updated.visibility).toBe("shared");

    const logs = await testClient.run(async (ctx: any) =>
      ctx.db.query("activityLogs").collect(),
    );
    const assignLog = logs.find((l: any) => l.action === "assigned");
    expect(assignLog.entityType).toBe("task");
    const metadata = JSON.parse(assignLog.metadata);
    expect(metadata.assigneeId).toBe(otherUserId);
  });

  test("keeps visibility private when assigning to creator", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "Self-assign task",
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );

    await client.mutation(api.tasks.mutations.assign, {
      taskId: tasks[0]._id,
      assigneeId: userId,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(tasks[0]._id),
    );
    expect(updated.assigneeId).toBe(userId);
    expect(updated.visibility).toBe("private");
  });

  test("unassigns private task and flips visibility to shared", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "Private task",
    });
    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    expect(tasks[0].visibility).toBe("private");

    await client.mutation(api.tasks.mutations.assign, {
      taskId: tasks[0]._id,
      assigneeId: undefined,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(tasks[0]._id),
    );
    expect(updated.assigneeId).toBeUndefined();
    expect(updated.visibility).toBe("shared");

    const logs = await testClient.run(async (ctx: any) =>
      ctx.db.query("activityLogs").collect(),
    );
    const unassignLog = logs.find((l: any) => l.action === "unassigned");
    expect(unassignLog.entityType).toBe("task");
  });

  test("keeps visibility shared when unassigning already-shared task", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "Unassign task",
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );

    const otherUserId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "Other User" }),
    );
    await client.mutation(api.tasks.mutations.assign, {
      taskId: tasks[0]._id,
      assigneeId: otherUserId,
    });

    await client.mutation(api.tasks.mutations.assign, {
      taskId: tasks[0]._id,
      assigneeId: undefined,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(tasks[0]._id),
    );
    expect(updated.assigneeId).toBeUndefined();
    expect(updated.visibility).toBe("shared");
  });

  test("throws 'Task not found' for deleted task", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, { title: "Temp" });
    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    const taskId = tasks[0]._id;
    await testClient.run(async (ctx: any) => ctx.db.delete(taskId));

    await expect(
      client.mutation(api.tasks.mutations.assign, {
        taskId,
        assigneeId: undefined,
      }),
    ).rejects.toThrow("Task not found");
  });

  test("silently ignores unauthenticated call", async ({ testClient }) => {
    const taskId = await testClient.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", { name: "Seed" });
      return ctx.db.insert("tasks", {
        title: "Seed",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 1,
      });
    });

    const otherUserId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "Other" }),
    );

    await testClient.mutation(api.tasks.mutations.assign, {
      taskId,
      assigneeId: otherUserId,
    });

    const task = await testClient.run(async (ctx: any) => ctx.db.get(taskId));
    expect(task.visibility).toBe("private");
  });
});

describe("createInProject", () => {
  test("creates task with shared visibility and project link", async ({
    client,
    userId,
    testClient,
  }) => {
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
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Project Task");
    expect(tasks[0].visibility).toBe("shared");
    expect(tasks[0].projectId).toBe(projectId);
    expect(tasks[0].creatorId).toBe(userId);
    expect(tasks[0].assigneeId).toBe(userId);
    expect(tasks[0].status).toBe("todo");
    expect(tasks[0].priority).toBe(false);
  });

  test("silently ignores unauthenticated call", async ({ testClient }) => {
    const projectId = await testClient.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", { name: "Seed" });
      return ctx.db.insert("projects", {
        name: "Seed Project",
        status: "active",
        creatorId: userId,
      });
    });

    await testClient.mutation(api.tasks.mutations.createInProject, {
      title: "Should not be created",
      projectId,
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    expect(tasks).toHaveLength(0);
  });
});

describe("assignToProject", () => {
  test("assigns task to project and flips visibility to shared", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.projects.mutations.create, {
      name: "Target Project",
    });
    await client.mutation(api.tasks.mutations.create, {
      title: "Loose Task",
    });

    const projects = await testClient.run(async (ctx: any) =>
      ctx.db.query("projects").collect(),
    );
    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    expect(tasks[0].visibility).toBe("private");

    await client.mutation(api.tasks.mutations.assignToProject, {
      taskId: tasks[0]._id,
      projectId: projects[0]._id,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(tasks[0]._id),
    );
    expect(updated.projectId).toBe(projects[0]._id);
    expect(updated.visibility).toBe("shared");
  });

  test("restores private visibility when removing from project (creator=assignee)", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api.projects.mutations.create, {
      name: "Source Project",
    });
    const projects = await testClient.run(async (ctx: any) =>
      ctx.db.query("projects").collect(),
    );

    await client.mutation(api.tasks.mutations.createInProject, {
      title: "Project Task",
      projectId: projects[0]._id,
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    expect(tasks[0].visibility).toBe("shared");
    expect(tasks[0].creatorId).toBe(userId);
    expect(tasks[0].assigneeId).toBe(userId);

    await client.mutation(api.tasks.mutations.assignToProject, {
      taskId: tasks[0]._id,
      projectId: undefined,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(tasks[0]._id),
    );
    expect(updated.projectId).toBeUndefined();
    expect(updated.visibility).toBe("private");
  });

  test("keeps shared visibility when removing from project (different assignee)", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.projects.mutations.create, {
      name: "Source Project",
    });
    const projects = await testClient.run(async (ctx: any) =>
      ctx.db.query("projects").collect(),
    );

    await client.mutation(api.tasks.mutations.createInProject, {
      title: "Shared Task",
      projectId: projects[0]._id,
    });

    const otherUserId = await testClient.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "Other" }),
    );
    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    await testClient.run(async (ctx: any) =>
      ctx.db.patch(tasks[0]._id, { assigneeId: otherUserId }),
    );

    await client.mutation(api.tasks.mutations.assignToProject, {
      taskId: tasks[0]._id,
      projectId: undefined,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(tasks[0]._id),
    );
    expect(updated.projectId).toBeUndefined();
    expect(updated.visibility).toBe("shared");
  });

  test("throws 'Task not found' for deleted task", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.tasks.mutations.create, { title: "Temp" });
    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );
    const taskId = tasks[0]._id;
    await testClient.run(async (ctx: any) => ctx.db.delete(taskId));

    await expect(
      client.mutation(api.tasks.mutations.assignToProject, {
        taskId,
        projectId: undefined,
      }),
    ).rejects.toThrow("Task not found");
  });

  test("silently ignores unauthenticated call", async ({ testClient }) => {
    const taskId = await testClient.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", { name: "Seed" });
      return ctx.db.insert("tasks", {
        title: "Seed",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 1,
      });
    });

    await testClient.mutation(api.tasks.mutations.assignToProject, {
      taskId,
      projectId: undefined,
    });

    const task = await testClient.run(async (ctx: any) => ctx.db.get(taskId));
    expect(task.visibility).toBe("private");
  });
});

describe("reorder", () => {
  test("updates position field", async ({ client, testClient }) => {
    await client.mutation(api.tasks.mutations.create, {
      title: "Reorder task",
    });

    const tasks = await testClient.run(async (ctx: any) =>
      ctx.db.query("tasks").collect(),
    );

    await client.mutation(api.tasks.mutations.reorder, {
      taskId: tasks[0]._id,
      newPosition: 42,
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(tasks[0]._id),
    );
    expect(updated.position).toBe(42);
  });

  test("silently ignores unauthenticated call", async ({ testClient }) => {
    const taskId = await testClient.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", { name: "Seed" });
      return ctx.db.insert("tasks", {
        title: "Seed",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 1,
      });
    });

    await testClient.mutation(api.tasks.mutations.reorder, {
      taskId,
      newPosition: 999,
    });

    const task = await testClient.run(async (ctx: any) => ctx.db.get(taskId));
    expect(task.position).toBe(1);
  });
});
