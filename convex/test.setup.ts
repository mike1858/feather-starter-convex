/// <reference types="vite/client" />
import { createConvexTest } from "feather-testing-convex";
import schema, { CURRENCIES, INTERVALS, PLANS } from "./schema";

export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
export const test = createConvexTest(schema, modules);

/**
 * Seed helpers for common test data.
 */

/** Seed both Free and Pro plans into the DB. Returns their IDs. */
export async function seedPlans(testClient: {
  run: (fn: (ctx: any) => Promise<any>) => Promise<any>;
}) {
  const freePlanId = await testClient.run(async (ctx: any) => {
    return ctx.db.insert("plans", {
      key: PLANS.FREE,
      stripeId: "prod_free_test",
      name: "Free",
      description: "Free plan",
      prices: {
        [INTERVALS.MONTH]: {
          [CURRENCIES.USD]: { stripeId: "price_free_month_usd", amount: 0 },
          [CURRENCIES.EUR]: { stripeId: "price_free_month_eur", amount: 0 },
        },
        [INTERVALS.YEAR]: {
          [CURRENCIES.USD]: { stripeId: "price_free_year_usd", amount: 0 },
          [CURRENCIES.EUR]: { stripeId: "price_free_year_eur", amount: 0 },
        },
      },
    });
  });

  const proPlanId = await testClient.run(async (ctx: any) => {
    return ctx.db.insert("plans", {
      key: PLANS.PRO,
      stripeId: "prod_pro_test",
      name: "Pro",
      description: "Pro plan",
      prices: {
        [INTERVALS.MONTH]: {
          [CURRENCIES.USD]: {
            stripeId: "price_pro_month_usd",
            amount: 1990,
          },
          [CURRENCIES.EUR]: {
            stripeId: "price_pro_month_eur",
            amount: 1990,
          },
        },
        [INTERVALS.YEAR]: {
          [CURRENCIES.USD]: {
            stripeId: "price_pro_year_usd",
            amount: 19990,
          },
          [CURRENCIES.EUR]: {
            stripeId: "price_pro_year_eur",
            amount: 19990,
          },
        },
      },
    });
  });

  return { freePlanId, proPlanId };
}

/** Seed a subscription for a user. Returns the subscription ID. */
export async function seedSubscription(
  testClient: { run: (fn: (ctx: any) => Promise<any>) => Promise<any> },
  opts: {
    userId: string;
    planId: string;
    stripeId?: string;
    interval?: "month" | "year";
    currency?: "usd" | "eur";
    status?: string;
  },
) {
  return testClient.run(async (ctx: any) => {
    return ctx.db.insert("subscriptions", {
      userId: opts.userId,
      planId: opts.planId,
      priceStripeId: "price_test",
      stripeId: opts.stripeId ?? "sub_test_123",
      currency: opts.currency ?? "usd",
      interval: opts.interval ?? "year",
      status: opts.status ?? "active",
      currentPeriodStart: 1000000,
      currentPeriodEnd: 2000000,
      cancelAtPeriodEnd: false,
    });
  });
}
