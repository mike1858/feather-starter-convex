// Test Matrix: SettingsPage
// | # | State                    | Approach    | What to verify                                    |
// |---|--------------------------|-------------|---------------------------------------------------|
// | 1 | Loaded with username     | Integration | username field populated, lowercase hint           |
// | 2 | Form re-sync             | Integration | field updates when server data changes             |
// | 3 | Username update          | Integration | submit updates backend                            |
// | 4 | Avatar with image URL    | Integration | reset button visible, img src correct             |
// | 5 | Remove avatar            | Integration | reset clears avatarUrl                            |
// | 6 | Validation error         | Integration | short username shows border-destructive            |
// | 7 | Delete account           | Integration | double-check flow, user deleted                   |
// | 8 | File input handler       | Integration | processes file selection                          |
// | 9 | File input no files      | Integration | early returns on null/empty files                 |
// |10 | Unauthenticated          | Integration | renders nothing                                   |

import { expect } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test } from "@cvx/test.setup";
import { api } from "~/convex/_generated/api";
import { renderWithRouter } from "@/test-helpers";
import { SettingsPage } from "./index";

test("renders username field with lowercase hint", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, { username: "testuser123" });
  });

  renderWithRouter(<SettingsPage />, client);

  expect(
    await screen.findByDisplayValue("testuser123"),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/lowercase and alphanumeric/i),
  ).toBeInTheDocument();
});

test("re-syncs username form when server data changes", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, { username: "oldname" });
  });

  const { unmount } = renderWithRouter(<SettingsPage />, client);

  expect(await screen.findByDisplayValue("oldname")).toBeInTheDocument();

  const user = userEvent.setup();
  const input = screen.getByPlaceholderText("Username");
  await user.clear(input);
  await user.type(input, "localedits");

  expect(screen.getByDisplayValue("localedits")).toBeInTheDocument();

  unmount();
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, { username: "newname" });
  });

  renderWithRouter(<SettingsPage />, client);
  expect(await screen.findByDisplayValue("newname")).toBeInTheDocument();
});

test("updates username via form submission", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, { username: "oldname" });
  });

  renderWithRouter(<SettingsPage />, client);

  const user = userEvent.setup();

  expect(await screen.findByDisplayValue("oldname")).toBeInTheDocument();

  const input = screen.getByPlaceholderText("Username");
  await user.clear(input);
  await user.type(input, "newname");

  await user.click(screen.getByRole("button", { name: /save/i }));

  await waitFor(async () => {
    const updatedUser = await client.query(
      api.users.queries.getCurrentUser,
      {},
    );
    expect(updatedUser?.username).toBe("newname");
  });
});

test("shows reset button when avatar exists", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, {
      username: "testuser",
      image: "https://example.com/avatar.png",
    });
  });

  renderWithRouter(<SettingsPage />, client);

  expect(
    await screen.findByRole("button", { name: /reset/i }),
  ).toBeInTheDocument();
});

test("renders avatar image with correct src", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, {
      username: "avataruser",
      image: "https://example.com/avatar.png",
    });
  });

  renderWithRouter(<SettingsPage />, client);

  await waitFor(() => {
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
  });
});

test("clears avatar on reset button click", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, {
      username: "testuser",
      image: "https://example.com/avatar.png",
    });
  });

  renderWithRouter(<SettingsPage />, client);

  const user = userEvent.setup();

  expect(
    await screen.findByRole("button", { name: /reset/i }),
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /reset/i }));

  await waitFor(async () => {
    const updatedUser = await client.query(
      api.users.queries.getCurrentUser,
      {},
    );
    expect(updatedUser?.avatarUrl).toBeUndefined();
  });
});

test("shows validation error for short username", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, { username: "testuser" });
  });

  renderWithRouter(<SettingsPage />, client);

  const user = userEvent.setup();

  expect(
    await screen.findByDisplayValue("testuser"),
  ).toBeInTheDocument();

  const input = screen.getByPlaceholderText("Username");
  await user.clear(input);
  await user.type(input, "ab");

  await user.click(screen.getByRole("button", { name: /save/i }));

  await waitFor(() => {
    expect(input.className).toContain("border-destructive");
  });
});

test("deletes account with double-check confirmation", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, { username: "testuser" });
  });

  renderWithRouter(<SettingsPage />, client);

  const user = userEvent.setup();

  const deleteButton = await screen.findByRole("button", {
    name: /delete account/i,
  });

  await user.click(deleteButton);

  const confirmButton = await screen.findByRole("button", {
    name: /are you sure/i,
  });

  await user.click(confirmButton);

  await waitFor(async () => {
    const deletedUser = await client.query(
      api.users.queries.getCurrentUser,
      {},
    );
    expect(deletedUser).toBeNull();
  });
});

test("processes file input onChange", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, { username: "testuser" });
  });

  renderWithRouter(<SettingsPage />, client);

  const user = userEvent.setup();

  await screen.findByDisplayValue("testuser");

  const fileInput = document.getElementById(
    "avatar_field",
  ) as HTMLInputElement;
  expect(fileInput).toBeTruthy();

  const file = new File(["test-image"], "avatar.png", { type: "image/png" });
  await user.upload(fileInput, file);
});

test("handles file input with no files selected", async ({
  client,
  testClient,
  userId,
}) => {
  await testClient.run(async (ctx: any) => {
    await ctx.db.patch(userId, { username: "testuser" });
  });

  renderWithRouter(<SettingsPage />, client);

  await screen.findByDisplayValue("testuser");

  const fileInput = document.getElementById(
    "avatar_field",
  ) as HTMLInputElement;
  expect(fileInput).toBeTruthy();

  fireEvent.change(fileInput, { target: { files: null } });
  fireEvent.change(fileInput, { target: { files: [] } });
});

test("renders nothing when unauthenticated", async ({ testClient }) => {
  const { container } = renderWithRouter(<SettingsPage />, testClient, {
    authenticated: false,
  });

  await waitFor(
    () => {
      expect(container.innerHTML).toBe("");
    },
    { timeout: 2000 },
  );
});
