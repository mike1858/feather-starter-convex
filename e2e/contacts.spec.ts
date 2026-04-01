import { test, expect } from "./fixtures";
import { signUp, createContact, uniqueEmail } from "./helpers";

test.describe("Contact flows", () => {
  test("create a contact and verify badge", async ({ session }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "contactuser1");

    await session.visit("/dashboard/contacts");
    await session.assertText("Contacts");

    // Create a contact — defaults to status: lead
    await createContact(session, "Test Contact E2E");

    // Verify status badge
    await session.assertText("lead");
  });

  test("delete a contact with double-check", async ({ session, page }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "contactuser2");

    await session.visit("/dashboard/contacts");
    await createContact(session, "Delete Contact E2E");

    // Delete: find the item row, click trash, confirm "Delete?"
    const row = page
      .locator("div", { hasText: "Delete Contact E2E" })
      .first();
    const deleteBtn = row
      .getByRole("button", { name: /trash|delete/i })
      .or(row.locator("button:has(svg.lucide-trash-2)"));
    await deleteBtn.first().click();

    // Double-check confirmation
    await session.assertText("Delete?");
    await page.getByText("Delete?").click();

    // Verify removal
    await session.refuteText("Delete Contact E2E");
  });
});
