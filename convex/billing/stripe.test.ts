import { describe, expect } from "vitest";
import { internal } from "../_generated/api";
import { test, seedPlans, seedSubscription } from "../test.setup";

// Unhandled rejections from scheduled Stripe actions are suppressed
// globally in src/test-setup.ts — no per-file handler needed.

describe("PREAUTH_updateCustomerId", () => {
  test("patches the user with the given customerId", async ({
    testClient,
    userId,
  }) => {
    await testClient.mutation(internal.billing.stripe.PREAUTH_updateCustomerId, {
      userId,
      customerId: "cus_abc123",
    });

    const user = await testClient.run(async (ctx: any) => ctx.db.get(userId));
    expect(user.customerId).toBe("cus_abc123");
  });
});

describe("PREAUTH_getUserById", () => {
  test("returns the user document", async ({ testClient, userId }) => {
    const user = await testClient.query(internal.billing.stripe.PREAUTH_getUserById, {
      userId,
    });
    expect(user).toBeDefined();
    expect(user!._id).toBe(userId);
  });
});

describe("UNAUTH_getDefaultPlan", () => {
  test("returns the free plan when seeded", async ({ testClient }) => {
    await seedPlans(testClient);

    const plan = await testClient.query(internal.billing.stripe.UNAUTH_getDefaultPlan);
    expect(plan).toBeDefined();
    expect(plan!.key).toBe("free");
  });

  test("returns null when no plans exist", async ({ testClient }) => {
    const plan = await testClient.query(internal.billing.stripe.UNAUTH_getDefaultPlan);
    expect(plan).toBeNull();
  });
});

describe("PREAUTH_getUserByCustomerId", () => {
  test("returns user with subscription and planKey", async ({
    testClient,
    userId,
  }) => {
    const { freePlanId } = await seedPlans(testClient);
    await seedSubscription(testClient, { userId, planId: freePlanId });
    await testClient.run(async (ctx: any) => {
      await ctx.db.patch(userId, { customerId: "cus_test_lookup" });
    });

    const result = await testClient.query(
      internal.billing.stripe.PREAUTH_getUserByCustomerId,
      { customerId: "cus_test_lookup" },
    );
    expect(result).toBeDefined();
    expect(result!._id).toBe(userId);
    expect(result!.subscription.planKey).toBe("free");
  });

  test("throws when no user matches customerId", async ({ testClient }) => {
    await expect(
      testClient.query(internal.billing.stripe.PREAUTH_getUserByCustomerId, {
        customerId: "cus_nonexistent",
      }),
    ).rejects.toThrow("Something went wrong");
  });

  test("throws when user has no subscription", async ({
    testClient,
    userId,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.patch(userId, { customerId: "cus_no_sub" });
    });

    await expect(
      testClient.query(internal.billing.stripe.PREAUTH_getUserByCustomerId, {
        customerId: "cus_no_sub",
      }),
    ).rejects.toThrow("Something went wrong");
  });

  test("throws when subscription plan is missing", async ({
    testClient,
    userId,
  }) => {
    await testClient.run(async (ctx: any) => {
      await ctx.db.patch(userId, { customerId: "cus_bad_plan" });
      // Insert a subscription pointing to a non-existent plan
      const fakePlanId = await ctx.db.insert("plans", {
        key: "free",
        stripeId: "prod_temp",
        name: "Temp",
        description: "temp",
        prices: {
          month: {
            usd: { stripeId: "p1", amount: 0 },
            eur: { stripeId: "p2", amount: 0 },
          },
          year: {
            usd: { stripeId: "p3", amount: 0 },
            eur: { stripeId: "p4", amount: 0 },
          },
        },
      });
      await ctx.db.insert("subscriptions", {
        userId,
        planId: fakePlanId,
        priceStripeId: "price_test",
        stripeId: "sub_test",
        currency: "usd",
        interval: "year",
        status: "active",
        currentPeriodStart: 1000000,
        currentPeriodEnd: 2000000,
        cancelAtPeriodEnd: false,
      });
      // Now delete the plan so the lookup fails
      await ctx.db.delete(fakePlanId);
    });

    await expect(
      testClient.query(internal.billing.stripe.PREAUTH_getUserByCustomerId, {
        customerId: "cus_bad_plan",
      }),
    ).rejects.toThrow("Something went wrong");
  });
});

describe("PREAUTH_createSubscription", () => {
  test("inserts a new subscription", async ({ testClient, userId }) => {
    const { freePlanId } = await seedPlans(testClient);

    await testClient.mutation(internal.billing.stripe.PREAUTH_createSubscription, {
      userId,
      planId: freePlanId,
      priceStripeId: "price_free_year_usd",
      currency: "usd",
      stripeSubscriptionId: "sub_new_123",
      status: "active",
      interval: "year",
      currentPeriodStart: 1000,
      currentPeriodEnd: 2000,
      cancelAtPeriodEnd: false,
    });

    const subs = await testClient.run(async (ctx: any) =>
      ctx.db.query("subscriptions").collect(),
    );
    expect(subs).toHaveLength(1);
    expect(subs[0].stripeId).toBe("sub_new_123");
    expect(subs[0].userId).toBe(userId);
  });

  test("throws when subscription already exists", async ({
    testClient,
    userId,
  }) => {
    const { freePlanId } = await seedPlans(testClient);
    await seedSubscription(testClient, { userId, planId: freePlanId });

    await expect(
      testClient.mutation(internal.billing.stripe.PREAUTH_createSubscription, {
        userId,
        planId: freePlanId,
        priceStripeId: "price_dup",
        currency: "usd",
        stripeSubscriptionId: "sub_dup",
        status: "active",
        interval: "year",
        currentPeriodStart: 1000,
        currentPeriodEnd: 2000,
        cancelAtPeriodEnd: false,
      }),
    ).rejects.toThrow("Subscription already exists");
  });
});

describe("PREAUTH_replaceSubscription", () => {
  test("deletes old subscription and inserts new one", async ({
    testClient,
    userId,
  }) => {
    const { freePlanId, proPlanId } = await seedPlans(testClient);
    await seedSubscription(testClient, {
      userId,
      planId: freePlanId,
      stripeId: "sub_old",
    });

    await testClient.mutation(internal.billing.stripe.PREAUTH_replaceSubscription, {
      userId,
      subscriptionStripeId: "sub_new_replaced",
      input: {
        currency: "usd",
        planStripeId: "prod_pro_test",
        priceStripeId: "price_pro_month_usd",
        interval: "month",
        status: "active",
        currentPeriodStart: 3000,
        currentPeriodEnd: 4000,
        cancelAtPeriodEnd: false,
      },
    });

    const subs = await testClient.run(async (ctx: any) =>
      ctx.db.query("subscriptions").collect(),
    );
    expect(subs).toHaveLength(1);
    expect(subs[0].stripeId).toBe("sub_new_replaced");
    expect(subs[0].planId).toBe(proPlanId);
    expect(subs[0].interval).toBe("month");
  });

  test("throws when user has no existing subscription", async ({
    testClient,
    userId,
  }) => {
    await seedPlans(testClient);

    await expect(
      testClient.mutation(internal.billing.stripe.PREAUTH_replaceSubscription, {
        userId,
        subscriptionStripeId: "sub_x",
        input: {
          currency: "usd",
          planStripeId: "prod_pro_test",
          priceStripeId: "price_pro_month_usd",
          interval: "month",
          status: "active",
          currentPeriodStart: 3000,
          currentPeriodEnd: 4000,
          cancelAtPeriodEnd: false,
        },
      }),
    ).rejects.toThrow("Something went wrong");
  });

  test("throws when target plan does not exist", async ({
    testClient,
    userId,
  }) => {
    const { freePlanId } = await seedPlans(testClient);
    await seedSubscription(testClient, { userId, planId: freePlanId });

    await expect(
      testClient.mutation(internal.billing.stripe.PREAUTH_replaceSubscription, {
        userId,
        subscriptionStripeId: "sub_x",
        input: {
          currency: "usd",
          planStripeId: "prod_nonexistent",
          priceStripeId: "price_x",
          interval: "month",
          status: "active",
          currentPeriodStart: 3000,
          currentPeriodEnd: 4000,
          cancelAtPeriodEnd: false,
        },
      }),
    ).rejects.toThrow("Something went wrong");
  });
});

describe("PREAUTH_deleteSubscription", () => {
  test("deletes subscription by stripe ID", async ({
    testClient,
    userId,
  }) => {
    const { freePlanId } = await seedPlans(testClient);
    await seedSubscription(testClient, {
      userId,
      planId: freePlanId,
      stripeId: "sub_to_delete",
    });

    await testClient.mutation(internal.billing.stripe.PREAUTH_deleteSubscription, {
      subscriptionStripeId: "sub_to_delete",
    });

    const subs = await testClient.run(async (ctx: any) =>
      ctx.db.query("subscriptions").collect(),
    );
    expect(subs).toHaveLength(0);
  });

  test("throws when subscription not found", async ({ testClient }) => {
    await expect(
      testClient.mutation(internal.billing.stripe.PREAUTH_deleteSubscription, {
        subscriptionStripeId: "sub_nonexistent",
      }),
    ).rejects.toThrow("Something went wrong");
  });
});

describe("getCurrentUserSubscription", () => {
  test("returns current subscription and new plan", async ({
    client,
    testClient,
    userId,
  }) => {
    const { freePlanId, proPlanId } = await seedPlans(testClient);
    await seedSubscription(testClient, { userId, planId: freePlanId });

    const result = await client.query(
      internal.billing.stripe.getCurrentUserSubscription,
      { planId: proPlanId },
    );
    expect(result.currentSubscription).toBeDefined();
    expect(result.currentSubscription.plan).toBeDefined();
    expect(result.currentSubscription.plan!.key).toBe("free");
    expect(result.newPlan).toBeDefined();
    expect(result.newPlan!.key).toBe("pro");
  });

  test("throws when unauthenticated", async ({ testClient }) => {
    const { proPlanId } = await seedPlans(testClient);

    await expect(
      testClient.query(internal.billing.stripe.getCurrentUserSubscription, {
        planId: proPlanId,
      }),
    ).rejects.toThrow("Something went wrong");
  });

  test("throws when user has no subscription", async ({
    client,
    testClient,
  }) => {
    const { proPlanId } = await seedPlans(testClient);

    await expect(
      client.query(internal.billing.stripe.getCurrentUserSubscription, {
        planId: proPlanId,
      }),
    ).rejects.toThrow("Something went wrong");
  });
});
