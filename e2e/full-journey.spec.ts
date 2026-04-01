import { test, expect } from "./fixtures";
import {
  signUp,
  createTask,
  createProject,
  createTodo,
  createTicket,
  createContact,
  uniqueEmail,
} from "./helpers";

test.describe("Full navigation journey", () => {
  test("signup through every feature", async ({ session }) => {
    const email = uniqueEmail();
    await signUp(session, email, "password123", "journeyuser");

    // 1. Dashboard loads after signup
    await session.assertPath("/dashboard");

    // 2. Tasks — create an item
    await session.visit("/dashboard/tasks");
    await session.assertText("My Tasks");
    await createTask(session, "Journey Task E2E");

    // 3. Projects — create an item
    // (createProject visits /dashboard/projects internally)
    await createProject(session, "Journey Project E2E");

    // 4. Todos — create an item
    await session.visit("/dashboard/todos");
    await session.assertText("Todos");
    await createTodo(session, "Journey Todo E2E");

    // 5. Tickets — create an item
    await session.visit("/dashboard/tickets");
    await session.assertText("Tickets");
    await createTicket(session, "Journey Ticket E2E");

    // 6. Contacts — create an item
    await session.visit("/dashboard/contacts");
    await session.assertText("Contacts");
    await createContact(session, "Journey Contact E2E");

    // 7. Settings — verify page loads
    await session.visit("/dashboard/settings");
    await session.assertText("Your Username");

    // 8. Return to dashboard — verify it loads
    await session.visit("/dashboard");
    await session.assertPath("/dashboard");
  });
});
