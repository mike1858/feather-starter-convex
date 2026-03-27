// @generated-start imports
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test } from "@cvx/test.setup";
import { api } from "~/convex/_generated/api";
import { renderWithRouter } from "@/test-helpers";
import { WorkLogsPage } from "./";
// @generated-end imports
// @custom-start imports
// @custom-end imports

// -- Page rendering -----------------------------------------------------------

test("WorkLogs page renders heading", async ({ client }) => {
  renderWithRouter(<WorkLogsPage />, client);

  await waitFor(() => {
    expect(screen.getByText("Work Logs")).toBeInTheDocument();
  });
});

test("renders empty state when no work logs", async ({ client }) => {
  renderWithRouter(<WorkLogsPage />, client);

  await waitFor(() => {
    expect(
      screen.getByText("No work logs yet"),
    ).toBeInTheDocument();
  });
});

test("renders work log items when data exists", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.insert("work-logs", {
      
      
      
      body: "test description",
      
      
      
      
      
      
      
      
      timeMinutes: 0,
      
      userId,
    });
  });

  renderWithRouter(<WorkLogsPage />, client);

  await waitFor(() => {
    expect(screen.getByText("Test Work logs")).toBeInTheDocument();
  });
});

// -- Form submission ----------------------------------------------------------

test("inline form creates a work log", async ({ client }) => {
  renderWithRouter(<WorkLogsPage />, client);

  const user = userEvent.setup();

  await waitFor(() => {
    expect(screen.getByPlaceholderText(/add work log/i)).toBeInTheDocument();
  });

  const input = screen.getByPlaceholderText(/add work log/i);
  await user.type(input, "New work log from form");
  await user.click(screen.getByRole("button", { name: /add/i }));

  await waitFor(async () => {
    const items = await client.query(api["work-logs"].queries.list, {});
    expect(items.some((item: any) => {
      const title = item.title || item.name;
      return title === "New work log from form";
    })).toBe(true);
  });
});

// -- Status badge -------------------------------------------------------------


// -- Delete -------------------------------------------------------------------

test("delete button removes work log", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.insert("work-logs", {
      
      
      
      body: "",
      
      
      
      
      
      
      
      
      timeMinutes: 0,
      
      userId,
    });
  });

  renderWithRouter(<WorkLogsPage />, client);

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
    const items = await client.query(api["work-logs"].queries.list, {});
    expect(items).toHaveLength(0);
  });
});

// @custom-start tests
// @custom-end tests
