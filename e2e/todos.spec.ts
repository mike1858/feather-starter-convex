import { test, expect } from "./fixtures";
import { signUp, createTodo, uniqueEmail } from "./helpers";

test.describe("Todo flows", () => {
  test("create and delete a todo", async ({ session, page }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "todouser1");

    await session.visit("/dashboard/todos");
    await session.assertText("Todos");

    // Create a todo
    await createTodo(session, "Test Todo E2E");

    // Delete: find the item row, click trash, confirm "Delete?"
    const row = page.locator("div", { hasText: "Test Todo E2E" }).first();
    const deleteBtn = row
      .getByRole("button", { name: /trash|delete/i })
      .or(row.locator("button:has(svg.lucide-trash-2)"));
    await deleteBtn.first().click();

    // Double-check confirmation
    await session.assertText("Delete?");
    await page.getByText("Delete?").click();

    // Verify removal
    await session.refuteText("Test Todo E2E");
  });
});
