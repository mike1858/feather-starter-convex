import { test, expect } from "./fixtures";
import { signUp, createProject, uniqueEmail } from "./helpers";

test.describe("Project flows", () => {
  test("create a project", async ({ session }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "projuser1");

    // Navigate to Projects
    await session.visit("/dashboard/projects");
    await session.assertText("Projects");

    // Create project using the inline form
    await createProject(session, "Test Project E2E");
  });

  test("view project detail page", async ({ session, page }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "projuser2");

    await session.visit("/dashboard/projects");
    await createProject(session, "Detail Project E2E");

    // Click on the project card to navigate to detail
    await page.getByText("Detail Project E2E").click();

    // Should be on the project detail page
    await session.assertText("Detail Project E2E");
    await session.assertText("Back to Projects");
    await session.assertText("No tasks in this project.");
  });

  test("project status lifecycle: active -> on_hold -> completed", async ({
    session,
    page,
  }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "projuser3");

    await session.visit("/dashboard/projects");
    await createProject(session, "Status Project E2E");

    // Click the project card to go to detail
    await page.getByText("Status Project E2E").click();
    await session.assertText("Back to Projects");

    // Default status is "Active" — the Select shows the current status
    await session.assertText("Active");

    // Change status via the Select dropdown
    // Click the Select trigger to open dropdown
    const statusTrigger = page.locator('[class*="SelectTrigger"]').first();
    await statusTrigger.click();

    // Select "On Hold"
    await page.getByRole("option", { name: "On Hold" }).click();

    // Verify status changed
    await session.assertText("On Hold");

    // Change to "Completed"
    await statusTrigger.click();
    await page.getByRole("option", { name: "Completed" }).click();

    await session.assertText("Completed");
  });

  test("delete a project", async ({ session, page }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "projuser4");

    await session.visit("/dashboard/projects");
    await createProject(session, "Delete Project E2E");

    // Open the dropdown menu on the project card
    const card = page.locator("div", { hasText: "Delete Project E2E" }).first();
    const menuButton = card.getByRole("button").filter({ has: page.locator("svg") }).first();
    await menuButton.click();

    // Click "Delete" in the dropdown
    await page.getByRole("menuitem", { name: "Delete" }).click();

    // Double-check confirmation — click again to confirm
    // The dropdown item text changes to "Delete? (0 tasks will be deleted)"
    const confirmItem = page.getByRole("menuitem", { name: /Delete\?/ });
    if (await confirmItem.isVisible()) {
      await confirmItem.click();
    }

    // Verify project is removed
    await session.refuteText("Delete Project E2E");
  });
});
