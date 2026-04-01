/**
 * `feather stats` — show CLI usage statistics from local telemetry.
 *
 * Reads `.feather/telemetry.json` (NDJSON) and prints an aggregated summary
 * of commands, features, and error rates for the specified time range.
 */
import { Command } from "commander";
import * as path from "node:path";
import { readEvents, type TelemetryEvent } from "../lib/telemetry";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StatsResult {
  totalEvents: number;
  commandCounts: Record<string, number>;
  featureCounts: Record<string, number>;
  errorRate: number;
  failedCommands: number;
  mostGeneratedFeature: string | null;
  periodDays: number;
}

export interface StatsOptions {
  days?: number;
}

// ── Action ─────────────────────────────────────────────────────────────────────

/**
 * Compute stats from local telemetry file.
 * Filters events to the given time range (default: 30 days).
 */
export function statsAction(
  options: StatsOptions,
  projectRoot: string,
): StatsResult {
  const days = options.days ?? 30;
  const telemetryPath = path.join(
    projectRoot,
    ".feather",
    "telemetry.json",
  );
  const allEvents = readEvents(telemetryPath);

  // Filter by time range
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const events = allEvents.filter(
    (e) => new Date(e.timestamp) >= cutoff,
  );

  if (events.length === 0) {
    return {
      totalEvents: 0,
      commandCounts: {},
      featureCounts: {},
      errorRate: 0,
      failedCommands: 0,
      mostGeneratedFeature: null,
      periodDays: days,
    };
  }

  const commandCounts: Record<string, number> = {};
  const featureCounts: Record<string, number> = {};
  let failedCommands = 0;

  for (const event of events) {
    // Command counts
    commandCounts[event.command] =
      (commandCounts[event.command] ?? 0) + 1;

    // Feature counts (skip events without feature)
    if (event.feature) {
      featureCounts[event.feature] =
        (featureCounts[event.feature] ?? 0) + 1;
    }

    // Failure tracking
    if (!event.success) {
      failedCommands++;
    }
  }

  // Most generated feature
  let mostGeneratedFeature: string | null = null;
  let maxCount = 0;
  for (const [feature, count] of Object.entries(featureCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostGeneratedFeature = feature;
    }
  }

  return {
    totalEvents: events.length,
    commandCounts,
    featureCounts,
    errorRate: failedCommands / events.length,
    failedCommands,
    mostGeneratedFeature,
    periodDays: days,
  };
}

// ── Formatter ──────────────────────────────────────────────────────────────────

/**
 * Format stats result as readable terminal output.
 */
export function formatStats(result: StatsResult): string {
  const lines: string[] = [];

  lines.push(`  Feather CLI Stats (last ${result.periodDays} days)`);
  lines.push(`  ${"=".repeat(40)}`);
  lines.push(`  Total commands: ${result.totalEvents}`);
  lines.push(
    `  Error rate: ${(result.errorRate * 100).toFixed(1)}% (${result.failedCommands} failed)`,
  );
  lines.push("");

  if (Object.keys(result.commandCounts).length > 0) {
    lines.push("  Commands:");
    const sorted = Object.entries(result.commandCounts).sort(
      (a, b) => b[1] - a[1],
    );
    for (const [cmd, count] of sorted) {
      lines.push(`    ${cmd.padEnd(20)} ${count}`);
    }
    lines.push("");
  }

  if (Object.keys(result.featureCounts).length > 0) {
    lines.push("  Features:");
    const sorted = Object.entries(result.featureCounts).sort(
      (a, b) => b[1] - a[1],
    );
    for (const [feature, count] of sorted) {
      lines.push(`    ${feature.padEnd(20)} ${count}`);
    }
    lines.push("");
  }

  if (result.mostGeneratedFeature) {
    const count = result.featureCounts[result.mostGeneratedFeature] ?? 0;
    lines.push(
      `  Most generated: ${result.mostGeneratedFeature} (${count})`,
    );
  }

  return lines.join("\n");
}

// ── Command ────────────────────────────────────────────────────────────────────

export const statsCommand = new Command("stats")
  .description("Show CLI usage statistics from local telemetry")
  .option("--days <n>", "Time range in days", "30")
  .action((opts: { days: string }) => {
    const projectRoot = process.cwd();
    const result = statsAction({ days: parseInt(opts.days, 10) }, projectRoot);
    console.log(formatStats(result));
  });
