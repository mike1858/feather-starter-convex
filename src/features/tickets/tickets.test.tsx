// @generated-start imports
import { expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test } from "@cvx/test.setup";
import { api } from "~/convex/_generated/api";
import { renderWithRouter } from "@/test-helpers";
import { TicketsPage } from "./";
// @generated-end imports
// @custom-start imports
// @custom-end imports

// i18n is NOT loaded in the test environment (no HTTP backend).
// useTranslation("tickets") returns the key as-is: t("page.title") → "page.title".

// -- Page rendering -----------------------------------------------------------

test("Tickets page renders heading", async ({ client }) => {
  renderWithRouter(<TicketsPage />, client);

  await waitFor(() => {
    expect(screen.getByText("page.title")).toBeInTheDocument();
  });
});

test("renders empty state when no tickets", async ({ client }) => {
  renderWithRouter(<TicketsPage />, client);

  await waitFor(() => {
    expect(
      screen.getByText("empty.title"),
    ).toBeInTheDocument();
  });
});

test("renders ticket items when data exists", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.insert("tickets", {
      title: "Test Tickets",
      description: "test description",
      status: "open",
      priority: "low",
      userId,
      position: 1000,
    });
  });

  renderWithRouter(<TicketsPage />, client);

  await waitFor(() => {
    expect(screen.getByText("Test Tickets")).toBeInTheDocument();
  });
});

// -- Form submission ----------------------------------------------------------

test("inline form creates a ticket", async ({ client }) => {
  renderWithRouter(<TicketsPage />, client);

  const user = userEvent.setup();

  // i18n key "form.addInline" is rendered as placeholder
  await waitFor(() => {
    expect(screen.getByPlaceholderText("form.addInline")).toBeInTheDocument();
  });

  const input = screen.getByPlaceholderText("form.addInline");
  await user.type(input, "New ticket from form");
  // The submit button renders t("form.submit", "Add") — the second arg is the default value
  await user.click(screen.getByRole("button", { name: "Add" }));

  await waitFor(async () => {
    const items = await client.query(api.tickets.queries.list, {});
    expect(items.some((item: any) => item.title === "New ticket from form")).toBe(true);
  });
});

// -- Status badge -------------------------------------------------------------


// -- Delete -------------------------------------------------------------------

test("delete button removes ticket", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.insert("tickets", {
      title: "Delete me",
      description: "",
      status: "open",
      priority: "low",
      userId,
      position: 1000,
    });
  });

  renderWithRouter(<TicketsPage />, client);

  const user = userEvent.setup();

  await waitFor(() => {
    expect(screen.getByText("Delete me")).toBeInTheDocument();
  });

  // First click shows confirmation (double-check pattern)
  const itemRow = screen.getByText("Delete me").closest("div.group");
  const deleteButton = itemRow!.querySelector("button:last-child")!;
  await user.click(deleteButton);

  // i18n key "delete.confirm" is rendered
  await waitFor(() => {
    expect(screen.getByText("delete.confirm")).toBeInTheDocument();
  });

  // Second click confirms deletion
  await user.click(screen.getByText("delete.confirm"));

  await waitFor(async () => {
    const items = await client.query(api.tickets.queries.list, {});
    expect(items).toHaveLength(0);
  });
});

// @custom-start tests
// @custom-end tests
