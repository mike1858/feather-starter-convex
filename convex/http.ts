import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

// Error digest receiving endpoint (for admin Convex instances)
const receiveDigest = httpAction(async (ctx, request) => {
  const authHeader = request.headers.get("Authorization");
  const expectedSecret = process.env.DIGEST_RECEIVE_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const digest = await request.json();

  await ctx.runMutation(internal.devErrors.mutations.storeDigest, {
    digest: JSON.stringify(digest),
    receivedAt: Date.now(),
  });

  return new Response(null, { status: 200 });
});

http.route({
  path: "/api/errors/digest",
  method: "POST",
  handler: receiveDigest,
});

export default http;
