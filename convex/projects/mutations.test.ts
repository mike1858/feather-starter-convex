// Test Matrix: projects mutations
// | # | Mutation | State                                    | What to verify                                  |
// |---|---------|------------------------------------------|-------------------------------------------------|
// | 1 | create  | with name                                | name, status=active, creatorId, "created" log   |
// | 2 | create  | unauthenticated                          | no project inserted                             |
// | 3 | update  | name only                                | name changed, status untouched, "edited" log    |
// | 4 | update  | status only                              | status changed, name untouched, "status_changed"|
// | 5 | update  | unauthenticated                          | no change                                       |
// | 6 | update  | project not found                        | throws "Project not found"                      |
// | 7 | remove  | project with tasks                       | project + tasks deleted                         |
// | 8 | remove  | empty project                            | project deleted, "deleted" log                  |
// | 9 | remove  | cascades through tasks to subtasks/logs  | subtasks + work logs also deleted               |
// |10 | remove  | unauthenticated                          | project not deleted                             |

import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";

describe("create", () => {
  test("creates project with active status and logs created activity", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api.projects.mutations.create, {
      name: "My Project",
    });

    const projects = await testClient.run(async (ctx: any) =>
      ctx.db.query("projects").collect(),
    );
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe("My Project");
    expect(projects[0].status).toBe("active");
    expect(projects[0].creatorId).toBe(userId);

    const logs = await testClient.run(async (ctx: any) =>
      ctx.db.query("activityLogs").collect(),
    );
    expect(logs).toHaveLength(1);
    expect(logs[0].entityType).toBe("project");
    expect(logs[0].entityId).toBe(projects[0]._id);
    expect(logs[0].action).toBe("created");
  });

  test("silently ignores unauthenticated call", async ({ testClient }) => {
    await testClient.mutation(api.projects.mutations.create, {
      name: "Should not be created",
    });

    const projects = await testClient.run(async (ctx: any) =>
      ctx.db.query("projects").collect(),
    );
    expect(projects).toHaveLength(0);
  });
});

describe("update", () => {
  test("updates name and logs edited activity", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.projects.mutations.create, {
      name: "Original",
    });

    const projects = await testClient.run(async (ctx: any) =>
      ctx.db.query("projects").collect(),
    );
    const projectId = projects[0]._id;

    await client.mutation(api.projects.mutations.update, {
      projectId,
      name: "Updated",
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(projectId),
    );
    expect(updated.name).toBe("Updated");
    expect(updated.status).toBe("active"); // unchanged

    const logs = await testClient.run(async (ctx: any) =>
      ctx.db.query("activityLogs").collect(),
    );
    const editLog = logs.find((l: any) => l.action === "edited");
    expect(editLog.entityType).toBe("project");
    const metadata = JSON.parse(editLog.metadata);
    expect(metadata.fields).toContain("name");
  });

  test("updates status and logs status_changed activity", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.projects.mutations.create, {
      name: "Status Project",
    });

    const projects = await testClient.run(async (ctx: any) =>
      ctx.db.query("projects").collect(),
    );
    const projectId = projects[0]._id;

    await client.mutation(api.projects.mutations.update, {
      projectId,
      status: "on_hold",
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(projectId),
    );
    expect(updated.status).toBe("on_hold");
    expect(updated.name).toBe("Status Project"); // unchanged

    const logs = await testClient.run(async (ctx: any) =>
      ctx.db.query("activityLogs").collect(),
    );
    const statusLog = logs.find((l: any) => l.action === "status_changed");
    expect(statusLog.entityType).toBe("project");
    const metadata = JSON.parse(statusLog.metadata);
    expect(metadata.from).toBe("active");
    expect(metadata.to).toBe("on_hold");
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

    await testClient.mutation(api.projects.mutations.update, {
      projectId,
      name: "Should not change",
    });

    const project = await testClient.run(async (ctx: any) =>
      ctx.db.get(projectId),
    );
    expect(project.name).toBe("Seed Project");
  });

  test("throws 'Project not found' for deleted project", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.projects.mutations.create, {
      name: "Temporary",
    });
    const projects = await testClient.run(async (ctx: any) =>
      ctx.db.query("projects").collect(),
    );
    const projectId = projects[0]._id;
    await testClient.run(async (ctx: any) => ctx.db.delete(projectId));

    await expect(
      client.mutation(api.projects.mutations.update, {
        projectId,
        name: "Nope",
      }),
    ).rejects.toThrow("Project not found");
  });
});

describe("remove", () => {
  test("deletes project and cascades to tasks", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api.projects.mutations.create, {
      name: "To Delete",
    });

    const projects = await testClient.run(async (ctx: any) =>
      ctx.db.query("projects").collect(),
    );
    const projectId = projects[0]._id;

    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("tasks", {
        title: "Task 1",
        priority: false,
        status: "todo",
        visibility: "shared",
        creatorId: userId,
        assigneeId: userId,
        projectId,
        position: 1,
      });
      await ctx.db.insert("tasks", {
        title: "Task 2",
        priority: false,
        status: "todo",
        visibility: "shared",
        creatorId: userId,
        assigneeId: userId,
        projectId,
        position: 2,
      });
    });

    await client.mutation(api.projects.mutations.remove, { projectId });

    expect(
      await testClient.run(async (ctx: any) =>
        ctx.db.query("projects").collect(),
      ),
    ).toHaveLength(0);
    expect(
      await testClient.run(async (ctx: any) =>
        ctx.db.query("tasks").collect(),
      ),
    ).toHaveLength(0);
  });

  test("deletes empty project and logs deleted activity", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.projects.mutations.create, {
      name: "Empty Project",
    });

    const projects = await testClient.run(async (ctx: any) =>
      ctx.db.query("projects").collect(),
    );
    const projectId = projects[0]._id;

    await client.mutation(api.projects.mutations.remove, { projectId });

    expect(
      await testClient.run(async (ctx: any) =>
        ctx.db.query("projects").collect(),
      ),
    ).toHaveLength(0);

    const logs = await testClient.run(async (ctx: any) =>
      ctx.db.query("activityLogs").collect(),
    );
    const deleteLog = logs.find((l: any) => l.action === "deleted");
    expect(deleteLog.entityType).toBe("project");
  });

  test("cascades through tasks to subtasks and work logs", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api.projects.mutations.create, {
      name: "Cascade Project",
    });
    const projects = await testClient.run(async (ctx: any) =>
      ctx.db.query("projects").collect(),
    );
    const projectId = projects[0]._id;

    await testClient.run(async (ctx: any) => {
      const taskId = await ctx.db.insert("tasks", {
        title: "Project Task",
        priority: false,
        status: "todo",
        visibility: "shared",
        creatorId: userId,
        assigneeId: userId,
        projectId,
        position: 1,
      });

      await ctx.db.insert("subtasks", {
        title: "Child subtask",
        status: "todo",
        taskId,
        position: 1,
        creatorId: userId,
      });

      await ctx.db.insert("workLogs", {
        body: "Logged work",
        timeMinutes: 30,
        taskId,
        creatorId: userId,
      });
    });

    expect(
      await testClient.run(async (ctx: any) =>
        ctx.db.query("tasks").collect(),
      ),
    ).toHaveLength(1);
    expect(
      await testClient.run(async (ctx: any) =>
        ctx.db.query("subtasks").collect(),
      ),
    ).toHaveLength(1);
    expect(
      await testClient.run(async (ctx: any) =>
        ctx.db.query("workLogs").collect(),
      ),
    ).toHaveLength(1);

    await client.mutation(api.projects.mutations.remove, { projectId });

    expect(
      await testClient.run(async (ctx: any) =>
        ctx.db.query("tasks").collect(),
      ),
    ).toHaveLength(0);
    expect(
      await testClient.run(async (ctx: any) =>
        ctx.db.query("subtasks").collect(),
      ),
    ).toHaveLength(0);
    expect(
      await testClient.run(async (ctx: any) =>
        ctx.db.query("workLogs").collect(),
      ),
    ).toHaveLength(0);
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

    await testClient.mutation(api.projects.mutations.remove, { projectId });

    const project = await testClient.run(async (ctx: any) =>
      ctx.db.get(projectId),
    );
    expect(project).not.toBeNull();
  });
});
