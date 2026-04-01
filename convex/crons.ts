import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily error digest at 9:00 UTC
// Schedule is deploy-time — changes require redeployment
crons.daily(
  "error digest",
  { hourUTC: 9, minuteUTC: 0 },
  // @ts-ignore TS2589: Convex deep type instantiation — non-deterministic, alternates between files
  internal.devErrors.actions.sendDigest,
);

export default crons;
