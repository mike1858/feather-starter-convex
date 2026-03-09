import { describe, expect } from "vitest";
import { internal } from "./_generated/api";
import { test } from "./test.setup";
import { CURRENCIES, INTERVALS, PLANS } from "./schema";

describe("insertSeedPlan", () => {
  test("inserts a plan document with all fields", async ({ testClient }) => {
    await testClient.mutation(internal.init.insertSeedPlan, {
      key: PLANS.FREE,
      stripeId: "prod_free_test",
      name: "Free",
      description: "Start with the basics",
      prices: {
        [INTERVALS.MONTH]: {
          [CURRENCIES.USD]: { stripeId: "price_free_m_usd", amount: 0 },
          [CURRENCIES.EUR]: { stripeId: "price_free_m_eur", amount: 0 },
        },
        [INTERVALS.YEAR]: {
          [CURRENCIES.USD]: { stripeId: "price_free_y_usd", amount: 0 },
          [CURRENCIES.EUR]: { stripeId: "price_free_y_eur", amount: 0 },
        },
      },
    });

    const plans = await testClient.run(async (ctx: any) =>
      ctx.db.query("plans").collect(),
    );
    expect(plans).toHaveLength(1);
    expect(plans[0].key).toBe("free");
    expect(plans[0].stripeId).toBe("prod_free_test");
    expect(plans[0].name).toBe("Free");
    expect(plans[0].description).toBe("Start with the basics");
    expect(plans[0].prices.month.usd.amount).toBe(0);
    expect(plans[0].prices.year.eur.stripeId).toBe("price_free_y_eur");
  });
});
