import { test, expect } from "./fixtures";
import { signUp, createTask, uniqueEmail } from "./helpers";

test.describe("Task flows", () => {
  test("create a task", async ({ session }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "taskuser1");

    // Navigate to My Tasks
    await session.visit("/dashboard/tasks");
    await session.assertText("My Tasks");

    // Create task using the inline form (placeholder-based input)
    await createTask(session, "Test Task E2E");
  });

  test("edit a task title inline", async ({ session, page }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "taskuser2");

    await session.visit("/dashboard/tasks");
    await createTask(session, "Original Title E2E");

    // Click on the title text to enter inline edit mode
    await page.getByText("Original Title E2E").click();

    // The title text becomes an input — clear and type new title
    const titleInput = page.locator("input[autofocus]");
    await titleInput.fill("Updated Title E2E");
    await titleInput.press("Enter");

    // Verify updated title appears
    await session.assertText("Updated Title E2E");
  });

  test("status transitions: todo -> in_progress -> done", async ({
    session,
    page,
  }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "taskuser3");

    await session.visit("/dashboard/tasks");
    await createTask(session, "Status Test E2E");

    // Initial status should be "To Do"
    await session.assertText("To Do");

    // Click the status badge to advance to "In Progress"
    await page.getByText("To Do").click();

    // Wait for and verify "In Progress"
    await session.assertText("In Progress");

    // Click the status badge to advance to "Done"
    await page.getByText("In Progress").click();

    // Verify "Done"
    await session.assertText("Done");
  });

  test("delete a task with double-check confirmation", async ({
    session,
    page,
  }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "taskuser4");

    await session.visit("/dashboard/tasks");
    await createTask(session, "Delete Me E2E");

    // Find the delete button (Trash2 icon) in the task row
    const taskRow = page.locator("div", { hasText: "Delete Me E2E" }).first();
    const deleteBtn = taskRow.getByRole("button", { name: /trash|delete/i }).or(
      taskRow.locator("button:has(svg.lucide-trash-2)"),
    );
    await deleteBtn.first().click();

    // Double-check: should now show "Are you sure?"
    await session.assertText("Are you sure?");

    // Confirm deletion
    await page.getByText("Are you sure?").click();

    // Verify task is removed
    await session.refuteText("Delete Me E2E");
  });
});
