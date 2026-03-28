// Test Matrix: OnboardingPage (UsernamePage)
// | # | State              | Approach    | What to verify                              |
// |---|--------------------| -----------|---------------------------------------------|
// | 1 | Initial form       | Integration | welcome heading, username field, continue    |
// | 2 | Valid submit       | Integration | completes onboarding, username set           |
// | 3 | Validation error   | Integration | short username shows border-destructive      |

import { expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test } from "@cvx/test.setup";
import { api } from "~/convex/_generated/api";
import { renderWithRouter } from "@/test-helpers";
import { UsernamePage } from "./index";

test("renders welcome form with username field and continue button", async ({
  client,
}) => {
  renderWithRouter(<UsernamePage />, client);

  expect(
    await screen.findByRole("heading", { name: /welcome/i }),
  ).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /continue/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/lowercase and alphanumeric/i),
  ).toBeInTheDocument();
});

test("submits valid username and updates backend", async ({ client }) => {
  renderWithRouter(<UsernamePage />, client);

  const user = userEvent.setup();

  const input = await screen.findByPlaceholderText("Username");
  await user.type(input, "newuser");

  await user.click(screen.getByRole("button", { name: /continue/i }));

  await waitFor(async () => {
    const updatedUser = await client.query(
      api.users.queries.getCurrentUser,
      {},
    );
    expect(updatedUser?.username).toBe("newuser");
  });
});

test("shows validation error for short username", async ({ client }) => {
  renderWithRouter(<UsernamePage />, client);

  const user = userEvent.setup();

  const input = await screen.findByPlaceholderText("Username");
  await user.type(input, "ab");

  await user.click(screen.getByRole("button", { name: /continue/i }));

  await waitFor(() => {
    expect(input.className).toContain("border-destructive");
  });
});
