import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { test, seedPlans, seedSubscription } from "@cvx/test.setup";
import { renderWithRouter } from "@/test-helpers";
import { CheckoutPage } from "@/features/billing";
import { Route } from "./_layout.checkout";

describe("Route.beforeLoad", () => {
  it("returns the correct title", () => {
    const context = Route.options.beforeLoad!({} as any);
    expect(context).toEqual({ title: "Feather Starter - Checkout" });
  });
});

test("pro subscription shows checkout completed", async ({
  client,
  testClient,
  userId,
}) => {
  const { proPlanId } = await seedPlans(testClient);
  await seedSubscription(testClient, { userId, planId: proPlanId });

  renderWithRouter(<CheckoutPage />, client);

  await waitFor(() => {
    expect(screen.getByText("Checkout completed!")).toBeInTheDocument();
  });
});

test("free subscription shows error after timeout", async ({
  client,
  testClient,
  userId,
}) => {
  const { freePlanId } = await seedPlans(testClient);
  await seedSubscription(testClient, { userId, planId: freePlanId });

  vi.useFakeTimers({ shouldAdvanceTime: true });

  renderWithRouter(<CheckoutPage />, client);

  // Initially shows loading state
  await waitFor(() => {
    expect(
      screen.getByText("Completing your checkout ..."),
    ).toBeInTheDocument();
  });

  // Advance past the 8-second timeout
  await vi.advanceTimersByTimeAsync(8500);

  await waitFor(() => {
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
  });

  vi.useRealTimers();
});

test("renders nothing when unauthenticated", async ({ testClient }) => {
  await seedPlans(testClient);

  const { container } = renderWithRouter(<CheckoutPage />, testClient, {
    authenticated: false,
  });

  // Component returns null when no user — container stays empty
  await waitFor(
    () => {
      expect(container.innerHTML).toBe("");
    },
    { timeout: 2000 },
  );
});
