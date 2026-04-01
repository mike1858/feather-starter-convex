import type { ConvexReactClient } from "convex/react";
import { api } from "@cvx/_generated/api";

let convexClient: ConvexReactClient | null = null;

// Sentry module reference — loaded dynamically only when VITE_SENTRY_DSN is set
let sentryModule: { captureException: (error: Error, opts?: { extra?: Record<string, unknown> }) => void } | null = null;
let sentryInitialized = false;

export function setConvexClient(client: ConvexReactClient): void {
  convexClient = client;
}

/**
 * Initialize error capture with optional Sentry Layer 2.
 * When VITE_SENTRY_DSN is set, dynamically imports @sentry/react and initializes it.
 * When not set, no Sentry code is loaded (tree-shaken away).
 */
export async function initErrorCapture(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn,
      enabled: import.meta.env.PROD,
    });
    sentryModule = Sentry;
    sentryInitialized = true;
  }
}

const SENSITIVE_PATTERNS =
  /password|token|secret|key|authorization|cookie|session/i;

export function sanitizeArgs(args: Record<string, unknown>): string {
  const cleaned: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(args)) {
    cleaned[k] = SENSITIVE_PATTERNS.test(k) ? "[REDACTED]" : val;
  }
  return JSON.stringify(cleaned);
}

export function captureError(
  source: "frontend" | "backend" | "silent" | "startup",
  error: unknown,
  context?: Record<string, unknown>,
): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));

    // Layer 1: Store to devErrors table
    if (!convexClient) {
      // eslint-disable-next-line no-console
      console.error(
        "[error-capture] No Convex client set, logging to console:",
        error,
      );
    } else {
      const mutation = convexClient.mutation(api.devErrors.mutations.store, {
        source,
        message: err.message,
        stack: err.stack,
        route:
          typeof window !== "undefined" ? window.location.pathname : undefined,
        functionName: context?.functionName as string | undefined,
        args: context?.args
          ? sanitizeArgs(context.args as Record<string, unknown>)
          : undefined,
        browserInfo:
          typeof navigator !== "undefined"
            ? JSON.stringify({ userAgent: navigator.userAgent })
            : undefined,
        timestamp: Date.now(),
      });
      // Fire and forget — do not await in error handler
      void mutation;
    }

    // Layer 2: Also report to Sentry if configured (per D-14)
    if (sentryInitialized && sentryModule) {
      sentryModule.captureException(err, {
        extra: { source, ...context },
      });
    }
  } catch {
    // NEVER let error capture throw — prevents infinite loops
    // eslint-disable-next-line no-console
    console.error("[error-capture] Failed to capture error:", error);
  }
}

// Test-only: reset Sentry state for test isolation
/* v8 ignore start -- test-only utility for resetting module state between tests */
export function _resetSentryForTest(): void {
  sentryModule = null;
  sentryInitialized = false;
}
/* v8 ignore stop */
