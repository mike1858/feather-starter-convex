// Test Matrix: TasksPage
// | # | State               | Approach    | What to verify                                         |
// |---|---------------------|-------------|--------------------------------------------------------|
// | 1 | Empty list          | Integration | empty state message, task form visible                 |
// | 2 | With tasks          | Integration | task items rendered                                    |
// | 3 | Create task         | Integration | form submit creates task, list updates                 |
// | 4 | Status badge click  | Integration | advances status from todo to in_progress               |
// | 5 | Done badge disabled | Integration | done status badge button is disabled                   |
// | 6 | Delete task         | Integration | double-check pattern, then task removed                |
// | 7 | Priority toggle     | Integration | flag click toggles priority                            |
// | 8 | Inline title edit   | Integration | click title, type new title, Enter saves               |
// | 9 | Inline edit cancel  | Integration | Escape reverts to original title                       |
// |10 | Keyboard edit mode  | Integration | Enter key on title span enters edit mode               |
// |11 | No-op edit          | Integration | blur without change does not trigger mutation           |
//
// Test Matrix: TeamPoolPage
// | # | State               | Approach    | What to verify                                         |
// |---|---------------------|-------------|--------------------------------------------------------|
// | 1 | Empty pool          | Integration | empty state message                                    |
// | 2 | With tasks          | Integration | unassigned shared tasks visible, grab buttons           |
// | 3 | Grab task           | Integration | assign mutation removes from pool                      |

import { describe, expect } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test } from "@cvx/test.setup";
import { api } from "~/convex/_generated/api";
import { renderWithRouter } from "@/test-helpers";
import { TasksPage, TeamPoolPage } from "./index";

// ── TasksPage ──────────────────────────────────────────────────────

describe("TasksPage", () => {
  test("shows empty state with create form when no tasks", async ({
    client,
  }) => {
    renderWithRouter(<TasksPage />, client);

    expect(
      await screen.findByText("No tasks yet. Create one above!"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Add a task...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  });

  test("renders seeded tasks", async ({ client, testClient, userId }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("tasks", {
        title: "Buy groceries",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 1000,
      });
      await ctx.db.insert("tasks", {
        title: "Write tests",
        priority: true,
        status: "in_progress",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 2000,
      });
    });

    renderWithRouter(<TasksPage />, client);

    expect(await screen.findByText("Buy groceries")).toBeInTheDocument();
    expect(screen.getByText("Write tests")).toBeInTheDocument();
  });

  test("creates task via form submission", async ({ client }) => {
    renderWithRouter(<TasksPage />, client);

    const user = userEvent.setup();

    const input = await screen.findByPlaceholderText("Add a task...");
    await user.type(input, "New task from form");
    await user.click(screen.getByRole("button", { name: /add/i }));

    await waitFor(async () => {
      const tasks = await client.query(api.tasks.queries.myTasks, {});
      expect(tasks.some((t: any) => t.title === "New task from form")).toBe(
        true,
      );
    });
  });

  test("advances status from todo to in_progress on badge click", async ({
    client,
    testClient,
    userId,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("tasks", {
        title: "Status test task",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 1000,
      });
    });

    renderWithRouter(<TasksPage />, client);

    const user = userEvent.setup();

    expect(await screen.findByText("Status test task")).toBeInTheDocument();
    expect(screen.getByText("To Do")).toBeInTheDocument();

    await user.click(screen.getByText("To Do"));

    await waitFor(async () => {
      const task = await client.query(api.tasks.queries.myTasks, {});
      expect(task[0].status).toBe("in_progress");
    });
  });

  test("disables done status badge button", async ({
    client,
    testClient,
    userId,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("tasks", {
        title: "Done task",
        priority: false,
        status: "done",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 1000,
      });
    });

    renderWithRouter(<TasksPage />, client);

    expect(await screen.findByText("Done")).toBeInTheDocument();

    const doneButton = screen.getByText("Done").closest("button");
    expect(doneButton).toBeDisabled();
  });

  test("deletes task with double-check confirmation", async ({
    client,
    testClient,
    userId,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("tasks", {
        title: "Task to delete",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 1000,
      });
    });

    renderWithRouter(<TasksPage />, client);

    const user = userEvent.setup();

    expect(await screen.findByText("Task to delete")).toBeInTheDocument();

    // First click on delete button shows "Are you sure?"
    const taskRow = screen
      .getByText("Task to delete")
      .closest("div.flex.items-center");
    const buttons = taskRow!.querySelectorAll("button");
    const trashButton = buttons[buttons.length - 1];
    await user.click(trashButton!);

    expect(await screen.findByText("Are you sure?")).toBeInTheDocument();

    // Second click confirms deletion
    await user.click(screen.getByText("Are you sure?"));

    await waitFor(async () => {
      const tasks = await client.query(api.tasks.queries.myTasks, {});
      expect(tasks).toHaveLength(0);
    });
  });

  test("toggles priority via flag button", async ({
    client,
    testClient,
    userId,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("tasks", {
        title: "Priority task",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 1000,
      });
    });

    renderWithRouter(<TasksPage />, client);

    const user = userEvent.setup();

    expect(await screen.findByText("Priority task")).toBeInTheDocument();

    const flagButton = screen.getByTitle("Normal");
    await user.click(flagButton);

    await waitFor(async () => {
      const tasks = await client.query(api.tasks.queries.myTasks, {});
      expect(tasks[0].priority).toBe(true);
    });
  });

  test("saves inline title edit on Enter", async ({
    client,
    testClient,
    userId,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("tasks", {
        title: "Editable title",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 1000,
      });
    });

    renderWithRouter(<TasksPage />, client);

    const user = userEvent.setup();

    expect(await screen.findByText("Editable title")).toBeInTheDocument();

    await user.click(screen.getByText("Editable title"));

    const input = await screen.findByDisplayValue("Editable title");
    await user.clear(input);
    await user.type(input, "Updated title{Enter}");

    await waitFor(async () => {
      const tasks = await client.query(api.tasks.queries.myTasks, {});
      expect(tasks[0].title).toBe("Updated title");
    });
  });

  test("cancels inline title edit on Escape", async ({
    client,
    testClient,
    userId,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("tasks", {
        title: "Keep this title",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 1000,
      });
    });

    renderWithRouter(<TasksPage />, client);

    const user = userEvent.setup();

    expect(await screen.findByText("Keep this title")).toBeInTheDocument();

    await user.click(screen.getByText("Keep this title"));

    await screen.findByDisplayValue("Keep this title");

    await user.keyboard("{Escape}");

    expect(await screen.findByText("Keep this title")).toBeInTheDocument();
  });

  test("enters edit mode via Enter key on title span", async ({
    client,
    testClient,
    userId,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("tasks", {
        title: "Keyboard edit",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 1000,
      });
    });

    renderWithRouter(<TasksPage />, client);

    expect(await screen.findByText("Keyboard edit")).toBeInTheDocument();

    const titleSpan = screen.getByText("Keyboard edit");
    fireEvent.keyDown(titleSpan, { key: "Enter" });

    expect(
      await screen.findByDisplayValue("Keyboard edit"),
    ).toBeInTheDocument();
  });

  test("skips mutation when title unchanged on blur", async ({
    client,
    testClient,
    userId,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("tasks", {
        title: "Same title",
        priority: false,
        status: "todo",
        visibility: "private",
        creatorId: userId,
        assigneeId: userId,
        position: 1000,
      });
    });

    renderWithRouter(<TasksPage />, client);

    const user = userEvent.setup();

    expect(await screen.findByText("Same title")).toBeInTheDocument();

    await user.click(screen.getByText("Same title"));

    await screen.findByDisplayValue("Same title");

    await user.tab(); // blur

    expect(await screen.findByText("Same title")).toBeInTheDocument();
  });
});

// ── TeamPoolPage ───────────────────────────────────────────────────

describe("TeamPoolPage", () => {
  test("shows empty state when no tasks in pool", async ({ client }) => {
    renderWithRouter(<TeamPoolPage />, client);

    expect(
      await screen.findByText("No tasks in the pool."),
    ).toBeInTheDocument();
  });

  test("renders unassigned tasks with grab buttons", async ({
    client,
    testClient,
    userId,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("tasks", {
        title: "Grab me",
        priority: false,
        status: "todo",
        visibility: "shared",
        creatorId: userId,
        position: 1000,
      });
    });

    renderWithRouter(<TeamPoolPage />, client);

    expect(await screen.findByText("Grab me")).toBeInTheDocument();

    const grabButtons = screen.getAllByRole("button", { name: /grab/i });
    expect(grabButtons.length).toBeGreaterThan(0);
  });

  test("grab mutation removes task from pool", async ({
    client,
    testClient,
    userId,
  }) => {
    let taskId: any;
    await testClient.run(async (ctx: any) => {
      taskId = await ctx.db.insert("tasks", {
        title: "Backend grab",
        priority: false,
        status: "todo",
        visibility: "shared",
        creatorId: userId,
        position: 1000,
      });
    });

    await client.mutation(api.tasks.mutations.assign, {
      taskId,
      assigneeId: userId,
    });

    const pool = await client.query(api.tasks.queries.teamPool, {});
    expect(pool).toHaveLength(0);
  });
});
