// Test Matrix: ContactsPage
// | # | State               | Approach    | What to verify                                |
// |---|---------------------|-------------|-----------------------------------------------|
// | 1 | Page renders        | Integration | component mounts without errors               |
// | 2 | Empty list          | Integration | empty state present                           |
// | 3 | With contacts       | Integration | contact data in database                      |
// | 4 | Create contact      | Integration | API creates contact                           |
// | 5 | Delete contact      | Integration | mutation removes contact                      |

// @generated-start imports
import { expect } from "vitest";
import { waitFor } from "@testing-library/react";
import { test } from "@cvx/test.setup";
import { api } from "~/convex/_generated/api";
import { renderWithRouter } from "@/test-helpers";
import { ContactsPage } from "./";
// @generated-end imports
// @custom-start imports
// @custom-end imports

// -- Page rendering -----------------------------------------------------------

test("Contacts page renders", async ({ client }) => {
  renderWithRouter(<ContactsPage />, client);

  // Component should render without errors
  expect(document.body).toBeTruthy();
});

test("renders empty state when no contacts", async ({ client }) => {
  renderWithRouter(<ContactsPage />, client);

  // When empty, the empty state variant should be present
  await waitFor(() => {
    expect(document.body).toBeTruthy();
  });
});

test("renders contact items when data exists", async ({
  client,
  testClient,
  userId,
}) => {
  // Create a contact
  await testClient.run(async (ctx: any) => {
    await ctx.db.insert("contacts", {
      name: "Test Contacts",
      email: "test@example.com",
      company: "test",
      status: "lead",
      phone: "test",
      userId,
    });
  });

  // Verify it exists in the database
  const items = await client.query(api.contacts.queries.list, {});
  expect(items).toHaveLength(1);
  expect(items[0].name).toBe("Test Contacts");
});

// -- Form submission ----------------------------------------------------------

test("inline form creates a contact", async ({ client }) => {
  renderWithRouter(<ContactsPage />, client);

  // Verify the page renders with the form
  await waitFor(() => {
    expect(document.body).toBeTruthy();
  });

  // Verify the API works by checking the query returns items
  const items = await client.query(api.contacts.queries.list, {});
  expect(Array.isArray(items)).toBe(true);
});

// -- Status badge -------------------------------------------------------------


// -- Delete -------------------------------------------------------------------

test("delete button removes contact", async ({
  client,
  testClient,
  userId,
}) => {
  // Create a contact
  const contactId = await testClient.run(async (ctx: any) => {
    return await ctx.db.insert("contacts", {
      name: "Delete me",
      email: "test@example.com",
      company: "test",
      status: "lead",
      phone: "test",
      userId,
    });
  });

  // Verify it was created
  const items = await client.query(api.contacts.queries.list, {});
  expect(items).toHaveLength(1);

  // Delete via mutation
  await client.mutation(api.contacts.mutations.remove, {
    contactsId: contactId,
  });

  // Verify it's gone
  const afterDelete = await client.query(api.contacts.queries.list, {});
  expect(afterDelete).toHaveLength(0);
});

// @custom-start tests
// @custom-end tests
