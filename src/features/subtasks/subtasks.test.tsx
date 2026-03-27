// @generated-start imports
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test } from "@cvx/test.setup";
import { api } from "~/convex/_generated/api";
import { renderWithRouter } from "@/test-helpers";
import { SubtasksPage } from "./";
// @generated-end imports
// @custom-start imports
// @custom-end imports

// -- Page rendering -----------------------------------------------------------

test("Subtasks page renders heading", async ({ client }) => {
  renderWithRouter(<SubtasksPage />, client);

  await waitFor(() => {
    expect(screen.getByText("Subtasks")).toBeInTheDocument();
  });
});

test("renders empty state when no subtasks", async ({ client }) => {
  renderWithRouter(<SubtasksPage />, client);

  await waitFor(() => {
    expect(
      screen.getByText("No subtasks yet"),
    ).toBeInTheDocument();
  });
});

test("renders subtask items when data exists", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.insert("subtasks", {
      title: "Test Subtasks",
      
      
      
      
      
      
      
      
      
      
      
      
      status: "todo",
      userId,
    });
  });

  renderWithRouter(<SubtasksPage />, client);

  await waitFor(() => {
    expect(screen.getByText("Test Subtasks")).toBeInTheDocument();
  });
});

// -- Form submission ----------------------------------------------------------

test("inline form creates a subtask", async ({ client }) => {
  renderWithRouter(<SubtasksPage />, client);

  const user = userEvent.setup();

  await waitFor(() => {
    expect(screen.getByPlaceholderText(/add subtask/i)).toBeInTheDocument();
  });

  const input = screen.getByPlaceholderText(/add subtask/i);
  await user.type(input, "New subtask from form");
  await user.click(screen.getByRole("button", { name: /add/i }));

  await waitFor(async () => {
    const items = await client.query(api.subtasks.queries.list, {});
    expect(items.some((item: any) => {
      const title = item.title || item.name;
      return title === "New subtask from form";
    })).toBe(true);
  });
});

// -- Status badge -------------------------------------------------------------


// -- Delete -------------------------------------------------------------------

test("delete button removes subtask", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.insert("subtasks", {
      title: "Delete me",
      
      
      
      
      
      
      
      
      
      
      
      
      status: "todo",
      userId,
    });
  });

  renderWithRouter(<SubtasksPage />, client);

  const user = userEvent.setup();

  await waitFor(() => {
    expect(screen.getByText("Delete me")).toBeInTheDocument();
  });

  // First click shows confirmation (double-check pattern)
  const itemRow = screen.getByText("Delete me").closest("div.group");
  const deleteButton = itemRow!.querySelector("button:last-child")!;
  await user.click(deleteButton);

  await waitFor(() => {
    expect(screen.getByText("Delete?")).toBeInTheDocument();
  });

  // Second click confirms deletion
  await user.click(screen.getByText("Delete?"));

  await waitFor(async () => {
    const items = await client.query(api.subtasks.queries.list, {});
    expect(items).toHaveLength(0);
  });
});

// @custom-start tests
// @custom-end tests
