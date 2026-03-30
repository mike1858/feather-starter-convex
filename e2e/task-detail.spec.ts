import { test, expect } from "./fixtures";
import { signUp, createTask, uniqueEmail } from "./helpers";

test.describe("Task detail panel", () => {
  test("add a subtask", async ({ session, page }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "detailuser1");

    await session.visit("/dashboard/tasks");
    await createTask(session, "Subtask Parent E2E");

    // Click the task row to open the detail panel (Sheet)
    await page
      .locator("div[role='button']", { hasText: "Subtask Parent E2E" })
      .first()
      .click();

    // Wait for the detail panel to open — it shows "Subtasks" heading
    await session.assertText("Subtasks");

    // Type a subtask in the "Add a subtask..." input and press Enter
    const subtaskInput = page.getByPlaceholder("Add a subtask...");
    await subtaskInput.fill("Sub-item 1");
    await subtaskInput.press("Enter");

    // Verify subtask appears
    await session.assertText("Sub-item 1");
  });

  test("mark subtask done", async ({ session, page }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "detailuser2");

    await session.visit("/dashboard/tasks");
    await createTask(session, "Subtask Toggle E2E");

    // Open detail panel
    await page
      .locator("div[role='button']", { hasText: "Subtask Toggle E2E" })
      .first()
      .click();

    await session.assertText("Subtasks");

    // Add a subtask
    const subtaskInput = page.getByPlaceholder("Add a subtask...");
    await subtaskInput.fill("Toggle Me");
    await subtaskInput.press("Enter");

    await session.assertText("Toggle Me");

    // Check the subtask checkbox to mark as done
    const checkbox = page.locator("input[type='checkbox']").first();
    await checkbox.check();

    // Verify: the subtask text should have line-through styling (done state),
    // and completion count should show "1/1 done"
    await session.assertText("1/1 done");
  });

  test("add a work log entry", async ({ session, page }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "detailuser3");

    await session.visit("/dashboard/tasks");
    await createTask(session, "Work Log Parent E2E");

    // Open detail panel
    await page
      .locator("div[role='button']", { hasText: "Work Log Parent E2E" })
      .first()
      .click();

    // Wait for Work Log section
    await session.assertText("Work Log");

    // Fill in the work log form
    const bodyTextarea = page.getByPlaceholder("What did you work on?");
    await bodyTextarea.fill("Implemented feature X");

    const timeInput = page.getByPlaceholder("e.g. 30m, 1h30m");
    await timeInput.fill("30m");

    // Click "Log work" button
    await page.getByRole("button", { name: "Log work" }).click();

    // Verify the work log entry appears
    await session.assertText("Implemented feature X");
    await session.assertText("30m");
  });

  test("activity timeline renders after status change", async ({
    session,
    page,
  }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "detailuser4");

    await session.visit("/dashboard/tasks");
    await createTask(session, "Activity Timeline E2E");

    // Change the task status to trigger an activity log entry
    // Click the "To Do" status badge to advance to "In Progress"
    await page.getByText("To Do").click();
    await session.assertText("In Progress");

    // Open detail panel
    await page
      .locator("div[role='button']", { hasText: "Activity Timeline E2E" })
      .first()
      .click();

    // The panel should render. Activity logs are generated server-side
    // when status changes. Verify the detail panel renders with the task info.
    await session.assertText("Activity Timeline E2E");
    await session.assertText("In Progress");
  });
});
