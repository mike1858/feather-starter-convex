// Test Matrix: ProjectsPage
// | # | State               | Approach    | What to verify                                  |
// |---|---------------------|-------------|--------------------------------------------------|
// | 1 | Empty list          | Integration | empty state message, create form visible         |
// | 2 | With projects       | Integration | project cards with task count                    |
// | 3 | Create project      | Integration | form submit creates project                      |
// | 4 | Status filter tabs  | Integration | All/Active/On Hold/Completed/Archived visible    |
//
// Test Matrix: ProjectDetailPage
// | # | State               | Approach    | What to verify                                  |
// |---|---------------------|-------------|--------------------------------------------------|
// | 1 | With tasks          | Integration | project name, task list, summary bar             |
// | 2 | Empty project       | Integration | empty task message, create input visible          |
// | 3 | Not found           | Integration | "Project not found" message                      |
// | 4 | Create task inline  | Integration | task appears in project                          |
// | 5 | Back link           | Integration | "Back to Projects" link visible                  |
//
// Test Matrix: ProjectStatusBadge
// | # | State      | Approach | What to verify                    |
// |---|------------|----------|-----------------------------------|
// | 1 | active     | Unit     | renders "Active"                  |
// | 2 | on_hold    | Unit     | renders "On Hold"                 |
// | 3 | completed  | Unit     | renders "Completed"               |
// | 4 | archived   | Unit     | renders "Archived"                |
//
// Test Matrix: TaskSummaryBar
// | # | State        | Approach | What to verify                    |
// |---|--------------|----------|-----------------------------------|
// | 1 | with tasks   | Unit     | shows per-status counts           |
// | 2 | zero tasks   | Unit     | renders nothing                   |

import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test } from "@cvx/test.setup";
import { api } from "~/convex/_generated/api";
import { renderWithRouter } from "@/test-helpers";
import { ProjectsPage } from "./index";
import { ProjectStatusBadge } from "./components/ProjectStatusBadge";
import { TaskSummaryBar } from "./components/TaskSummaryBar";
import { ProjectDetailPage } from "./components/ProjectDetailPage";
import type { Id } from "~/convex/_generated/dataModel";

// ── ProjectsPage ────────────────────────────────────────────────────

describe("ProjectsPage", () => {
  test("shows empty state with create form when no projects", async ({
    client,
  }) => {
    renderWithRouter(<ProjectsPage />, client);

    expect(
      await screen.findByText("No projects yet. Create one above!"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("New project name..."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create/i }),
    ).toBeInTheDocument();
  });

  test("renders project cards with task count", async ({
    client,
    testClient,
    userId,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("projects", {
        name: "Alpha",
        status: "active",
        creatorId: userId,
      });
    });

    renderWithRouter(<ProjectsPage />, client);

    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("0 tasks")).toBeInTheDocument();
  });

  test("creates project via form submission", async ({ client }) => {
    renderWithRouter(<ProjectsPage />, client);

    const user = userEvent.setup();

    const input = await screen.findByPlaceholderText("New project name...");
    await user.type(input, "Beta Project");
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(async () => {
      const projects = await client.query(api.projects.queries.list, {});
      expect(projects.some((p: any) => p.name === "Beta Project")).toBe(true);
    });
  });

  test("renders status filter tabs", async ({ client }) => {
    renderWithRouter(<ProjectsPage />, client);

    expect(await screen.findByText("All")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("On Hold")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });

  test("renders project card with status badge", async ({
    client,
    testClient,
    userId,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("projects", {
        name: "Card Test",
        status: "active",
        creatorId: userId,
      });
    });

    renderWithRouter(<ProjectsPage />, client);

    expect(await screen.findByText("Card Test")).toBeInTheDocument();
    // "Active" appears in filter tab and badge
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("0 tasks")).toBeInTheDocument();
  });
});

// ── ProjectDetailPage ───────────────────────────────────────────────

describe("ProjectDetailPage", () => {
  test("renders project name, task list, and summary bar", async ({
    client,
    testClient,
    userId,
  }) => {
    const projectId = await testClient.run(async (ctx: any) => {
      return ctx.db.insert("projects", {
        name: "Detail Test",
        status: "active",
        creatorId: userId,
      });
    });

    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("tasks", {
        title: "Project Task",
        priority: false,
        status: "todo",
        visibility: "shared",
        creatorId: userId,
        assigneeId: userId,
        projectId,
        position: 1,
      });
    });

    renderWithRouter(
      <ProjectDetailPage projectId={projectId as Id<"projects">} />,
      client,
    );

    expect(await screen.findByText("Detail Test")).toBeInTheDocument();
    expect(screen.getByText(/1 todo/)).toBeInTheDocument();
    expect(screen.getByText("Project Task")).toBeInTheDocument();
  });

  test("shows empty task message with create input", async ({
    client,
    testClient,
    userId,
  }) => {
    const projectId = await testClient.run(async (ctx: any) => {
      return ctx.db.insert("projects", {
        name: "Empty Project",
        status: "active",
        creatorId: userId,
      });
    });

    renderWithRouter(
      <ProjectDetailPage projectId={projectId as Id<"projects">} />,
      client,
    );

    expect(
      await screen.findByText("No tasks in this project."),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Add a task...")).toBeInTheDocument();
  });

  test("shows not found for nonexistent project", async ({
    client,
    testClient,
    userId,
  }) => {
    const projectId = await testClient.run(async (ctx: any) => {
      return ctx.db.insert("projects", {
        name: "Temp",
        status: "active",
        creatorId: userId,
      });
    });
    await testClient.run(async (ctx: any) => ctx.db.delete(projectId));

    renderWithRouter(
      <ProjectDetailPage projectId={projectId as Id<"projects">} />,
      client,
    );

    expect(
      await screen.findByText("Project not found."),
    ).toBeInTheDocument();
  });

  test("creates task inline", async ({ client, testClient, userId }) => {
    const projectId = await testClient.run(async (ctx: any) => {
      return ctx.db.insert("projects", {
        name: "Inline Creation",
        status: "active",
        creatorId: userId,
      });
    });

    renderWithRouter(
      <ProjectDetailPage projectId={projectId as Id<"projects">} />,
      client,
    );

    const user = userEvent.setup();

    const input = await screen.findByPlaceholderText("Add a task...");
    await user.type(input, "Inline task");
    await user.click(screen.getByRole("button", { name: /add/i }));

    await waitFor(async () => {
      const result = await client.query(api.projects.queries.getWithTasks, {
        projectId: projectId as Id<"projects">,
      });
      expect(result!.tasks.some((t: any) => t.title === "Inline task")).toBe(
        true,
      );
    });
  });

  test("renders back link to projects", async ({
    client,
    testClient,
    userId,
  }) => {
    const projectId = await testClient.run(async (ctx: any) => {
      return ctx.db.insert("projects", {
        name: "Back Link Test",
        status: "active",
        creatorId: userId,
      });
    });

    renderWithRouter(
      <ProjectDetailPage projectId={projectId as Id<"projects">} />,
      client,
    );

    expect(
      await screen.findByText("Back to Projects"),
    ).toBeInTheDocument();
  });
});

// ── ProjectStatusBadge ──────────────────────────────────────────────

describe("ProjectStatusBadge", () => {
  it("renders Active label", () => {
    render(<ProjectStatusBadge status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders On Hold label", () => {
    render(<ProjectStatusBadge status="on_hold" />);
    expect(screen.getByText("On Hold")).toBeInTheDocument();
  });

  it("renders Completed label", () => {
    render(<ProjectStatusBadge status="completed" />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders Archived label", () => {
    render(<ProjectStatusBadge status="archived" />);
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });
});

// ── TaskSummaryBar ──────────────────────────────────────────────────

describe("TaskSummaryBar", () => {
  it("renders per-status counts", () => {
    render(
      <TaskSummaryBar counts={{ todo: 3, in_progress: 2, done: 1 }} />,
    );
    expect(screen.getByText(/3 todo/)).toBeInTheDocument();
    expect(screen.getByText(/2 in progress/)).toBeInTheDocument();
    expect(screen.getByText(/1 done/)).toBeInTheDocument();
  });

  it("renders nothing when total is zero", () => {
    const { container } = render(
      <TaskSummaryBar counts={{ todo: 0, in_progress: 0, done: 0 }} />,
    );
    expect(container.querySelector(".flex.flex-col.gap-1")).toBeNull();
  });
});
