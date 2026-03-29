// Test Matrix: contacts mutations
// | # | Mutation | State              | What to verify                        |
// |---|---------|---------------------|---------------------------------------|
// | 1 | create  | with defaults       | name, userId persisted                |
// | 2 | create  | with all fields     | email, company, phone, status         |
// | 3 | create  | unauthenticated     | no contact inserted                   |
// | 4 | update  | unauthenticated     | no change to contact                  |
// | 5 | update  | specified fields    | only changed fields updated           |
// | 6 | update  | not found           | throws "not found"                    |
// | 7 | remove  | unauthenticated     | contact not deleted                   |
// | 8 | remove  | existing contact    | contact deleted                       |

// @generated-start imports
import { describe, expect } from "vitest";
import { api } from "../_generated/api";
import { test } from "../test.setup";
// @generated-end imports

// @custom-start imports
// @custom-end imports

// @generated-start test-create
describe("create", () => {
  test("creates a Contact with default values", async ({
    client,
    userId,
    testClient,
  }) => {
    await client.mutation(api.contacts.mutations.create, {
      name: "Test name",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("contacts").collect(),
    );
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe("Test name");
    expect(records[0].userId).toBe(userId);
  });

  test("creates a Contact with all fields specified", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.contacts.mutations.create, {
      name: "Full name",
      email: "Full email",
      company: "Full company",
      status: "lead",
      phone: "Full phone",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("contacts").collect(),
    );
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe("Full name");
    expect(records[0].email).toBe("Full email");
    expect(records[0].company).toBe("Full company");
    expect(records[0].phone).toBe("Full phone");
  });

  test("does nothing when unauthenticated", async ({ testClient }) => {
    await testClient.mutation(api.contacts.mutations.create, {
      name: "Should not be created",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("contacts").collect(),
    );
    expect(records).toHaveLength(0);
  });
});
// @generated-end test-create

// @generated-start test-update
describe("update", () => {
  test("does nothing when unauthenticated", async ({ testClient }) => {
    const recordId = await testClient.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", { name: "Seed" });
      return ctx.db.insert("contacts", {
        name: "Seed",
        email: "Seed",
        company: "Seed",
        status: "lead",
        phone: "Seed",
        userId,
      });
    });

    await testClient.mutation(api.contacts.mutations.update, {
      contactsId: recordId,
      name: "Should not change",
    });

    const record = await testClient.run(async (ctx: any) => ctx.db.get(recordId));
    expect(record.name).toBe("Seed");
  });

  test("updates only specified fields", async ({
    client,
    testClient,
  }) => {
    await client.mutation(api.contacts.mutations.create, {
      name: "Original name",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("contacts").collect(),
    );
    const recordId = records[0]._id;

    await client.mutation(api.contacts.mutations.update, {
      contactsId: recordId,
      name: "Updated name",
    });

    const updated = await testClient.run(async (ctx: any) =>
      ctx.db.get(recordId),
    );
    expect(updated.name).toBe("Updated name");
  });

  test("throws when Contact not found", async ({ client, testClient }) => {
    await client.mutation(api.contacts.mutations.create, {
      name: "Temporary",
    });
    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("contacts").collect(),
    );
    const recordId = records[0]._id;
    await testClient.run(async (ctx: any) => ctx.db.delete(recordId));

    await expect(
      client.mutation(api.contacts.mutations.update, {
        contactsId: recordId,
        name: "Nope",
      }),
    ).rejects.toThrow("not found");
  });
});
// @generated-end test-update

// @generated-start test-remove
describe("remove", () => {
  test("does nothing when unauthenticated", async ({ testClient }) => {
    const recordId = await testClient.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", { name: "Seed" });
      return ctx.db.insert("contacts", {
        name: "Seed",
        email: "Seed",
        company: "Seed",
        status: "lead",
        phone: "Seed",
        userId,
      });
    });

    await testClient.mutation(api.contacts.mutations.remove, { contactsId: recordId });

    const record = await testClient.run(async (ctx: any) => ctx.db.get(recordId));
    expect(record).not.toBeNull();
  });

  test("deletes a Contact", async ({ client, testClient }) => {
    await client.mutation(api.contacts.mutations.create, {
      name: "To delete",
    });

    const records = await testClient.run(async (ctx: any) =>
      ctx.db.query("contacts").collect(),
    );
    expect(records).toHaveLength(1);

    await client.mutation(api.contacts.mutations.remove, {
      contactsId: records[0]._id,
    });

    const remaining = await testClient.run(async (ctx: any) =>
      ctx.db.query("contacts").collect(),
    );
    expect(remaining).toHaveLength(0);
  });
});
// @generated-end test-remove



