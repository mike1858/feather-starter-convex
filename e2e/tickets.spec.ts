import { test, expect } from "./fixtures";
import { signUp, createTicket, uniqueEmail } from "./helpers";

test.describe("Ticket flows", () => {
  test("create a ticket and verify badges", async ({ session }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "ticketuser1");

    await session.visit("/dashboard/tickets");
    await session.assertText("Tickets");

    // Create a ticket — defaults to status: open, priority: low
    await createTicket(session, "Test Ticket E2E");

    // Verify status and priority badges
    await session.assertText("open");
    await session.assertText("low");
  });

  test("delete a ticket with double-check", async ({ session, page }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "ticketuser2");

    await session.visit("/dashboard/tickets");
    await createTicket(session, "Delete Ticket E2E");

    // Delete: find the item row, click trash, confirm "Delete?"
    const row = page
      .locator("div", { hasText: "Delete Ticket E2E" })
      .first();
    const deleteBtn = row
      .getByRole("button", { name: /trash|delete/i })
      .or(row.locator("button:has(svg.lucide-trash-2)"));
    await deleteBtn.first().click();

    // Double-check confirmation
    await session.assertText("Delete?");
    await page.getByText("Delete?").click();

    // Verify removal
    await session.refuteText("Delete Ticket E2E");
  });
});
