// Test Matrix: DevErrorsDashboard
// | # | State             | Approach    | What to verify                              |
// |---|-------------------|-------------|---------------------------------------------|
// | 1 | With errors       | Integration | error list items render with source badges   |
// | 2 | No errors         | Integration | empty state message visible                  |
// | 3 | Clear All clicked | Integration | clearAll mutation called                     |

import { expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test } from "@cvx/test.setup";
import { api } from "~/convex/_generated/api";
import { renderWithRouter } from "@/test-helpers";
import { DevErrorsDashboard } from "./index";

test("renders error list items with source badges", async ({
  client,
  testClient,
}) => {
  // Seed devErrors
  await testClient.mutation(api.devErrors.mutations.store, {
    source: "frontend",
    message: "Cannot read property 'x' of null",
    timestamp: 1000,
  });
  await testClient.mutation(api.devErrors.mutations.store, {
    source: "backend",
    message: "Server internal error",
    timestamp: 2000,
  });

  renderWithRouter(<DevErrorsDashboard />, client);

  expect(
    await screen.findByText("Cannot read property 'x' of null"),
  ).toBeInTheDocument();
  expect(screen.getByText("Server internal error")).toBeInTheDocument();
  expect(screen.getByText("frontend")).toBeInTheDocument();
  expect(screen.getByText("backend")).toBeInTheDocument();
});

test("shows empty state when no errors exist", async ({ client }) => {
  renderWithRouter(<DevErrorsDashboard />, client);

  expect(
    await screen.findByText("No errors captured yet"),
  ).toBeInTheDocument();
});

test("Clear All button calls clearAll mutation", async ({
  client,
  testClient,
}) => {
  // Seed an error so the button appears
  await testClient.mutation(api.devErrors.mutations.store, {
    source: "frontend",
    message: "Test error",
    timestamp: 1000,
  });

  renderWithRouter(<DevErrorsDashboard />, client);

  // Wait for error to appear
  await screen.findByText("Test error");

  // Click Clear All
  const user = userEvent.setup();
  const clearBtn = screen.getByTestId("clear-all-btn");
  await user.click(clearBtn);

  // Verify errors are cleared (empty state appears)
  expect(await screen.findByText("No errors captured yet")).toBeInTheDocument();
});
