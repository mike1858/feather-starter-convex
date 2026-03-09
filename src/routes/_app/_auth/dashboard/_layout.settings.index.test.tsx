import { describe, expect, it } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test, seedPlans, seedSubscription } from "@cvx/test.setup";
import { api } from "~/convex/_generated/api";
import { renderWithRouter } from "@/test-helpers";
import DashboardSettings, { Route } from "./_layout.settings.index";

describe("Route.beforeLoad", () => {
  it("returns the correct context", () => {
    const context = Route.options.beforeLoad!({} as any);
    expect(context).toEqual({
      title: "Settings",
      headerTitle: "Settings",
      headerDescription: "Manage your account settings.",
    });
  });
});

test("renders user info with username", async ({ client, testClient, userId }) => {
  const { freePlanId } = await seedPlans(testClient);
  await seedSubscription(testClient, { userId, planId: freePlanId });
  // Patch the existing user document (created by the test fixture)
  await testClient.run(async (ctx: any) => {
    const user = await ctx.db.get(userId);
    await ctx.db.patch(userId, { username: "testuser123" });
  });

  renderWithRouter(<DashboardSettings />, client);

  await waitFor(() => {
    expect(screen.getByDisplayValue("testuser123")).toBeInTheDocument();
  });
});

test("updates username via form", async ({ client, testClient, userId }) => {
  const { freePlanId } = await seedPlans(testClient);
  await seedSubscription(testClient, { userId, planId: freePlanId });
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, { username: "oldname" });
  });

  renderWithRouter(<DashboardSettings />, client);

  const user = userEvent.setup();

  // Wait for the form to populate
  await waitFor(() => {
    expect(screen.getByDisplayValue("oldname")).toBeInTheDocument();
  });

  const input = screen.getByPlaceholderText("Username");
  await user.clear(input);
  await user.type(input, "newname");

  const saveButton = screen.getByRole("button", { name: /save/i });
  await user.click(saveButton);

  // Verify the backend was updated
  await waitFor(async () => {
    const updatedUser = await client.query(api.users.queries.getCurrentUser, {});
    expect(updatedUser?.username).toBe("newname");
  });
});

test("reset button visible when avatar exists", async ({
  client,
  testClient,
  userId,
}) => {
  const { freePlanId } = await seedPlans(testClient);
  await seedSubscription(testClient, { userId, planId: freePlanId });
  // Seed user with an external image URL (avatarUrl derives from `image` field)
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, {
      username: "testuser",
      image: "https://example.com/avatar.png",
    });
  });

  renderWithRouter(<DashboardSettings />, client);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
  });
});

test("renders avatar image when avatarUrl exists", async ({
  client,
  testClient,
  userId,
}) => {
  const { freePlanId } = await seedPlans(testClient);
  await seedSubscription(testClient, { userId, planId: freePlanId });
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, {
      username: "avataruser",
      image: "https://example.com/avatar.png",
    });
  });

  renderWithRouter(<DashboardSettings />, client);

  await waitFor(() => {
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
  });
});

test("remove image button clears avatar", async ({ client, testClient, userId }) => {
  const { freePlanId } = await seedPlans(testClient);
  await seedSubscription(testClient, { userId, planId: freePlanId });
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, {
      username: "testuser",
      image: "https://example.com/avatar.png",
    });
  });

  renderWithRouter(<DashboardSettings />, client);

  const user = userEvent.setup();

  await waitFor(() => {
    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: /reset/i }));

  // Verify the backend was updated — avatar should be removed
  await waitFor(async () => {
    const updatedUser = await client.query(api.users.queries.getCurrentUser, {});
    expect(updatedUser?.avatarUrl).toBeUndefined();
  });
});

test("shows validation error for short username", async ({
  client,
  testClient,
  userId,
}) => {
  const { freePlanId } = await seedPlans(testClient);
  await seedSubscription(testClient, { userId, planId: freePlanId });
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, { username: "testuser" });
  });

  renderWithRouter(<DashboardSettings />, client);

  const user = userEvent.setup();

  await waitFor(() => {
    expect(screen.getByDisplayValue("testuser")).toBeInTheDocument();
  });

  const input = screen.getByPlaceholderText("Username");
  await user.clear(input);
  await user.type(input, "ab");

  const saveButton = screen.getByRole("button", { name: /save/i });
  await user.click(saveButton);

  // Validation error should appear
  await waitFor(() => {
    expect(input.className).toContain("border-destructive");
  });
});

test("delete account double-check flow and confirm", async ({
  client,
  testClient,
  userId,
}) => {
  const { freePlanId } = await seedPlans(testClient);
  await seedSubscription(testClient, { userId, planId: freePlanId });
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, { username: "testuser" });
  });

  renderWithRouter(<DashboardSettings />, client);

  const user = userEvent.setup();

  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: /delete account/i }),
    ).toBeInTheDocument();
  });

  // First click: triggers double-check
  const deleteButton = screen.getByRole("button", { name: /delete account/i });
  await user.click(deleteButton);

  // Button now shows "Are you sure?"
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: /are you sure/i }),
    ).toBeInTheDocument();
  });

  // Second click: confirms deletion
  const confirmButton = screen.getByRole("button", { name: /are you sure/i });
  await user.click(confirmButton);

  // Verify the backend user was deleted
  await waitFor(async () => {
    const deletedUser = await client.query(api.users.queries.getCurrentUser, {});
    expect(deletedUser).toBeNull();
  });
});

test("file input onChange handler processes files", async ({
  client,
  testClient,
  userId,
}) => {
  const { freePlanId } = await seedPlans(testClient);
  await seedSubscription(testClient, { userId, planId: freePlanId });
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, { username: "testuser" });
  });

  renderWithRouter(<DashboardSettings />, client);

  const user = userEvent.setup();

  await waitFor(() => {
    expect(screen.getByDisplayValue("testuser")).toBeInTheDocument();
  });

  // Get the hidden file input and simulate file selection
  const fileInput = document.getElementById("avatar_field") as HTMLInputElement;
  expect(fileInput).toBeTruthy();

  const file = new File(["test-image"], "avatar.png", { type: "image/png" });
  await user.upload(fileInput, file);
});

test("file input onChange early-returns when no files selected", async ({
  client,
  testClient,
  userId,
}) => {
  const { freePlanId } = await seedPlans(testClient);
  await seedSubscription(testClient, { userId, planId: freePlanId });
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, { username: "testuser" });
  });

  renderWithRouter(<DashboardSettings />, client);

  await waitFor(() => {
    expect(screen.getByDisplayValue("testuser")).toBeInTheDocument();
  });

  const fileInput = document.getElementById("avatar_field") as HTMLInputElement;
  expect(fileInput).toBeTruthy();

  // Fire change with no files — exercises the "!event.target.files" guard
  fireEvent.change(fileInput, { target: { files: null } });

  // Fire change with empty FileList — exercises the "files.length === 0" guard
  fireEvent.change(fileInput, { target: { files: [] } });
});

test("renders nothing when no user (unauthenticated)", async ({
  testClient,
}) => {
  await seedPlans(testClient);

  const { container } = renderWithRouter(<DashboardSettings />, testClient, {
    authenticated: false,
  });

  // Component returns null when no user — container stays empty
  await waitFor(
    () => {
      expect(container.innerHTML).toBe("");
    },
    { timeout: 2000 },
  );
});
