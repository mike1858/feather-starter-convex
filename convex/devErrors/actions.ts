import { internalAction } from "@cvx/_generated/server";
import { internal } from "@cvx/_generated/api";

export const sendDigest = internalAction({
  args: {},
  handler: async (ctx) => {
    // 1. Get undigested errors
    const errors = await ctx.runQuery(
      internal.devErrors.queries.listUndigested,
    );

    if (errors.length === 0) return;

    // 2. Build digest (per D-11: error count, top errors by frequency, environment info)
    const topErrors = buildTopErrors(errors, 10);
    const digest = {
      errorCount: errors.length,
      topErrors,
      environment: {
        timestamp: Date.now(),
        source: "feather-client",
      },
    };

    // 3. POST to configured endpoint (fire-and-forget)
    const endpoint = process.env.ERROR_DIGEST_ENDPOINT;
    const secret = process.env.ERROR_DIGEST_SECRET;

    if (endpoint && secret) {
      try {
        await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify(digest),
        });
      } catch (e) {
        // Fire-and-forget: log but don't fail the action
        console.error("[digest] Failed to POST:", e);
      }
    }

    // 4. Mark as digested (batch in groups of 50 for Convex arg size limits)
    const ids = errors.map((e) => e._id);
    for (let i = 0; i < ids.length; i += 50) {
      await ctx.runMutation(
        internal.devErrors.mutations.markDigestedInternal,
        {
          ids: ids.slice(i, i + 50),
        },
      );
    }
  },
});

interface ErrorRecord {
  message: string;
  stack?: string;
  functionName?: string;
}

interface TopError {
  message: string;
  stack?: string;
  functionName?: string;
  count: number;
}

export function buildTopErrors(
  errors: ErrorRecord[],
  limit: number,
): TopError[] {
  const freq = new Map<string, TopError>();
  for (const err of errors) {
    const key = err.message;
    const existing = freq.get(key);
    if (existing) {
      existing.count++;
    } else {
      freq.set(key, {
        message: err.message,
        stack: err.stack,
        functionName: err.functionName,
        count: 1,
      });
    }
  }
  return Array.from(freq.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
