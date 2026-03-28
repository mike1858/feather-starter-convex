// Test Matrix: DashboardPage
// | # | State  | Approach    | What to verify                                |
// |---|--------|-------------|-----------------------------------------------|
// | 1 | Loaded | Integration | get started heading and description visible   |

import { expect } from "vitest";
import { screen } from "@testing-library/react";
import { test } from "@cvx/test.setup";
import { renderWithRouter } from "@/test-helpers";
import { DashboardPage } from "./index";

test("renders dashboard page with get started content", async ({
  client,
}) => {
  renderWithRouter(<DashboardPage />, client);

  expect(await screen.findByText("Get Started")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Explore the Dashboard and get started with your first app.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByText(/go to settings/i)).toBeInTheDocument();
});
