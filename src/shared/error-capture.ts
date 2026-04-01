import type { ConvexReactClient } from "convex/react";
import { api } from "@cvx/_generated/api";

let convexClient: ConvexReactClient | null = null;

export function setConvexClient(client: ConvexReactClient): void {
  convexClient = client;
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
    if (!convexClient) {
      // eslint-disable-next-line no-console
      console.error(
        "[error-capture] No Convex client set, logging to console:",
        error,
      );
      return;
    }
    const err = error instanceof Error ? error : new Error(String(error));
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
  } catch {
    // NEVER let error capture throw — prevents infinite loops
    // eslint-disable-next-line no-console
    console.error("[error-capture] Failed to capture error:", error);
  }
}
