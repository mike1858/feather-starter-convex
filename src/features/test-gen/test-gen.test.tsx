// @generated-start imports
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test } from "@cvx/test.setup";
import { api } from "~/convex/_generated/api";
import { renderWithRouter } from "@/test-helpers";
import { TestGenPage } from "./";
// @generated-end imports
// @custom-start imports
// @custom-end imports

// -- Page rendering -----------------------------------------------------------

test("TestGen page renders heading", async ({ client }) => {
  renderWithRouter(<TestGenPage />, client);

  await waitFor(() => {
    expect(screen.getByText("Test Items")).toBeInTheDocument();
  });
});

test("renders empty state when no test items", async ({ client }) => {
  renderWithRouter(<TestGenPage />, client);

  await waitFor(() => {
    expect(
      screen.getByText("No test items yet"),
    ).toBeInTheDocument();
  });
});

test("renders test item items when data exists", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.insert("test-gen", {
      title: "Test Test gen",
      
      
      
      
      
      
      
      
      
      description: "test description",
      
      
      
      
      
      
      
      
      
      status: "draft",
      
      
      
      
      priority: false,
      
      
      createdAt: Date.now(),
      userId,
    });
  });

  renderWithRouter(<TestGenPage />, client);

  await waitFor(() => {
    expect(screen.getByText("Test Test gen")).toBeInTheDocument();
  });
});

// -- Form submission ----------------------------------------------------------

test("inline form creates a test item", async ({ client }) => {
  renderWithRouter(<TestGenPage />, client);

  const user = userEvent.setup();

  await waitFor(() => {
    expect(screen.getByPlaceholderText(/add test item/i)).toBeInTheDocument();
  });

  const input = screen.getByPlaceholderText(/add test item/i);
  await user.type(input, "New test item from form");
  await user.click(screen.getByRole("button", { name: /add/i }));

  await waitFor(async () => {
    const items = await client.query(api["test-gen"].queries.list, {});
    expect(items.some((item: any) => {
      const title = item.title || item.name;
      return title === "New test item from form";
    })).toBe(true);
  });
});

// -- Status badge -------------------------------------------------------------

test("status badge advances status on click", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.insert("test-gen", {
      title: "Status test",
      
      
      
      
      
      
      
      
      
      description: "",
      
      
      
      
      
      
      
      
      
      status: "draft",
      
      
      
      
      priority: false,
      
      
      createdAt: Date.now(),
      userId,
    });
  });

  renderWithRouter(<TestGenPage />, client);

  const user = userEvent.setup();

  await waitFor(() => {
    expect(screen.getByText("Status test")).toBeInTheDocument();
  });

  const firstStatus = "draft";
  expect(screen.getByText("Draft")).toBeInTheDocument();

  await user.click(screen.getByText("Draft"));

  await waitFor(async () => {
    const items = await client.query(api["test-gen"].queries.list, {});
    expect(items[0].status).not.toBe(firstStatus);
  });
});

// -- Delete -------------------------------------------------------------------

test("delete button removes test item", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.insert("test-gen", {
      title: "Delete me",
      
      
      
      
      
      
      
      
      
      description: "",
      
      
      
      
      
      
      
      
      
      status: "draft",
      
      
      
      
      priority: false,
      
      
      createdAt: Date.now(),
      userId,
    });
  });

  renderWithRouter(<TestGenPage />, client);

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
    const items = await client.query(api["test-gen"].queries.list, {});
    expect(items).toHaveLength(0);
  });
});

// @custom-start tests
// @custom-end tests
