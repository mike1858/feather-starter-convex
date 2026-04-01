import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily error digest at 9:00 UTC
// Schedule is deploy-time — changes require redeployment
crons.daily(
  "error digest",
  { hourUTC: 9, minuteUTC: 0 },
  // @ts-expect-error TS2589: Convex deep type instantiation — will auto-surface when fixed upstream
  internal.devErrors.actions.sendDigest,
);

export default crons;
