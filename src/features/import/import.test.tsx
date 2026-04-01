// Test Matrix: ImportHistory
// | # | State                | Approach    | What to verify                              |
// |---|----------------------|-------------|---------------------------------------------|
// | 1 | Empty state          | Integration | Shows "No imports yet" with link             |
// | 2 | With imports         | Integration | Renders list with file names, dates, badges  |
// | 3 | Status badges        | Integration | Correct color classes per status              |
// | 4 | Import stats         | Integration | Parses and displays stats JSON               |
// | 5 | Helper functions     | Unit        | statusBadgeClass and formatImportStats       |

import { expect, describe } from "vitest";
import { waitFor, screen } from "@testing-library/react";
import { test } from "@cvx/test.setup";
import { renderWithRouter } from "@/test-helpers";
import { ImportHistory } from "./components/ImportHistory";

// -- Empty state ---------------------------------------------------------------

test("renders empty state when no imports", async ({ client }) => {
  renderWithRouter(<ImportHistory />, client);

  await waitFor(() => {
    expect(screen.getByText("No imports yet.")).toBeTruthy();
  });
});

test("empty state has link to new import page", async ({ client }) => {
  renderWithRouter(<ImportHistory />, client);

  await waitFor(() => {
    const link = screen.getByText("Import your first Excel file");
    expect(link).toBeTruthy();
    expect(link.closest("a")).toHaveAttribute("href", "/dashboard/import");
  });
});

// -- With imports ---------------------------------------------------------------

test("renders import list with file names and status", async ({
  client,
  testClient,
  userId,
}) => {
  // Create test imports
  await testClient.run(async (ctx: any) => {
    await ctx.db.insert("imports", {
      fileName: "employees.xlsx",
      status: "complete",
      userId,
    });
    await ctx.db.insert("imports", {
      fileName: "projects.xlsx",
      status: "failed",
      userId,
    });
  });

  renderWithRouter(<ImportHistory />, client, {
    initialPath: "/dashboard/imports",
  });

  await waitFor(() => {
    expect(screen.getByText("employees.xlsx")).toBeTruthy();
    expect(screen.getByText("projects.xlsx")).toBeTruthy();
  });
});

test("shows header and New Import button when imports exist", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.insert("imports", {
      fileName: "data.xlsx",
      status: "complete",
      userId,
    });
  });

  renderWithRouter(<ImportHistory />, client, {
    initialPath: "/dashboard/imports",
  });

  await waitFor(() => {
    expect(screen.getByText("Import History")).toBeTruthy();
    expect(screen.getByText("New Import")).toBeTruthy();
  });
});

// -- Status badges ---------------------------------------------------------------

describe("status badge colors", () => {
  test("complete status shows green badge", async ({
    client,
    testClient,
    userId,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("imports", {
        fileName: "done.xlsx",
        status: "complete",
        userId,
      });
    });

    renderWithRouter(<ImportHistory />, client);

    await waitFor(() => {
      const badge = screen.getByText("complete");
      expect(badge.className).toContain("bg-green-100");
      expect(badge.className).toContain("text-green-800");
    });
  });

  test("failed status shows red badge", async ({
    client,
    testClient,
    userId,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("imports", {
        fileName: "broken.xlsx",
        status: "failed",
        userId,
      });
    });

    renderWithRouter(<ImportHistory />, client);

    await waitFor(() => {
      const badge = screen.getByText("failed");
      expect(badge.className).toContain("bg-red-100");
      expect(badge.className).toContain("text-red-800");
    });
  });

  test("pending status shows yellow badge", async ({
    client,
    testClient,
    userId,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.insert("imports", {
        fileName: "pending.xlsx",
        status: "pending",
        userId,
      });
    });

    renderWithRouter(<ImportHistory />, client);

    await waitFor(() => {
      const badge = screen.getByText("pending");
      expect(badge.className).toContain("bg-yellow-100");
      expect(badge.className).toContain("text-yellow-800");
    });
  });
});

// -- Import stats ---------------------------------------------------------------

test("displays import stats when available", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.insert("imports", {
      fileName: "stats.xlsx",
      status: "complete",
      userId,
      importStats: JSON.stringify({
        totalImported: 150,
        totalSkipped: 3,
      }),
    });
  });

  renderWithRouter(<ImportHistory />, client);

  await waitFor(() => {
    expect(screen.getByText("150 rows imported, 3 skipped")).toBeTruthy();
  });
});

test("displays stats with defaults when fields missing", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.insert("imports", {
      fileName: "partial-stats.xlsx",
      status: "complete",
      userId,
      importStats: JSON.stringify({}),
    });
  });

  renderWithRouter(<ImportHistory />, client);

  await waitFor(() => {
    expect(screen.getByText("0 rows imported, 0 skipped")).toBeTruthy();
  });
});

// -- Backend query ---------------------------------------------------------------

// Backend query tests (unauthenticated, sort order, user isolation)
// are in convex/imports/queries.test.ts
