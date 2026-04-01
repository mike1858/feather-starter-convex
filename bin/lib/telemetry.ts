/**
 * CLI telemetry infrastructure — local NDJSON event tracking with opt-out and optional remote reporting.
 *
 * Events are written to `.feather/telemetry.json` in NDJSON format (one JSON object per line).
 * Opt-out: set `FEATHER_TELEMETRY=false` env var or `telemetry.enabled: false` in feather.yaml.
 * Remote: configure `telemetry.remote` URL in feather.yaml for fire-and-forget POST.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import YAML from "yaml";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TelemetryEvent {
  command: string;
  feature?: string;
  bundle?: string;
  success: boolean;
  durationMs: number;
  timestamp: string;
  error?: string;
  // schema-level fields (only when level >= "schema")
  fieldCount?: number;
  fieldTypes?: string[];
  relationships?: string[];
}

export type TelemetryLevel = "basic" | "schema" | "full";

// ── Sensitive data patterns ────────────────────────────────────────────────────

const SENSITIVE_PATTERNS = [
  /password=\S+/gi,
  /token=\S+/gi,
  /secret=\S+/gi,
  /key=\S+/gi,
  /authorization=\S+/gi,
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function readYamlConfig(projectRoot: string): Record<string, unknown> | null {
  const yamlPath = path.join(projectRoot, "feather.yaml");
  if (!fs.existsSync(yamlPath)) return null;
  try {
    const content = fs.readFileSync(yamlPath, "utf-8");
    return YAML.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getTelemetryConfig(
  projectRoot: string,
): Record<string, unknown> | null {
  const config = readYamlConfig(projectRoot);
  if (!config || typeof config.telemetry !== "object" || config.telemetry === null)
    return null;
  return config.telemetry as Record<string, unknown>;
}

// ── Exports ────────────────────────────────────────────────────────────────────

/**
 * Check if telemetry is enabled.
 * - FEATHER_TELEMETRY=false env var takes precedence
 * - feather.yaml telemetry.enabled=false is second check
 * - Default: true
 */
export function isEnabled(projectRoot: string): boolean {
  if (process.env.FEATHER_TELEMETRY === "false") return false;

  const telemetryConfig = getTelemetryConfig(projectRoot);
  if (telemetryConfig && telemetryConfig.enabled === false) return false;

  return true;
}

/**
 * Append a telemetry event to .feather/telemetry.json in NDJSON format.
 * Creates the .feather/ directory if it doesn't exist.
 */
export function appendEvent(projectRoot: string, event: TelemetryEvent): void {
  const dir = path.join(projectRoot, ".feather");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, "telemetry.json");
  fs.appendFileSync(filePath, JSON.stringify(event) + "\n", "utf-8");
}

/**
 * Read all telemetry events from an NDJSON file.
 * Returns empty array if file doesn't exist. Ignores blank lines.
 */
export function readEvents(filePath: string): TelemetryEvent[] {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, "utf-8");
  return content
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as TelemetryEvent);
}

/**
 * POST a telemetry event to the configured remote endpoint.
 * Fire-and-forget: catches all errors silently.
 * Does nothing when no remote endpoint is configured.
 */
export async function postRemote(
  projectRoot: string,
  event: TelemetryEvent,
): Promise<void> {
  const telemetryConfig = getTelemetryConfig(projectRoot);
  if (!telemetryConfig || typeof telemetryConfig.remote !== "string") return;

  try {
    await fetch(telemetryConfig.remote, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch {
    // Fire-and-forget: silently ignore network errors
  }
}

/**
 * Sanitize a telemetry event by stripping sensitive data from string fields.
 * Matches patterns: password, token, secret, key, authorization.
 */
export function sanitizeEvent(event: TelemetryEvent): TelemetryEvent {
  const sanitized = { ...event };

  for (const key of Object.keys(sanitized) as (keyof TelemetryEvent)[]) {
    const value = sanitized[key];
    if (typeof value === "string") {
      let cleaned = value;
      for (const pattern of SENSITIVE_PATTERNS) {
        cleaned = cleaned.replace(pattern, `${pattern.source.split("=")[0].replace(/\\/g, "")}=[REDACTED]`);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sanitized as any)[key] = cleaned;
    }
  }

  return sanitized;
}

/**
 * Get the configured telemetry level from feather.yaml.
 * Default: "basic".
 */
export function getTelemetryLevel(projectRoot: string): TelemetryLevel {
  const telemetryConfig = getTelemetryConfig(projectRoot);
  if (!telemetryConfig) return "basic";

  const level = telemetryConfig.level;
  if (level === "basic" || level === "schema" || level === "full") return level;

  return "basic";
}
